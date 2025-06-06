from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, Message, Notification
from extensions import db
from utils.email import send_email
from utils.mention_utils import find_mentioned_users, create_mention_notifications
from flask_sse import sse


message_bp = Blueprint('message', __name__)

@message_bp.route('/projects/<int:project_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    messages = [
        {'id': m.id, 'user': m.user.username, 'content': m.content,
         'timestamp': m.timestamp.isoformat()}
        for m in project.messages
    ]
    return jsonify(messages)

@message_bp.cli.command('notify_tagged_users')
def notify_tagged_users():
    messages = Message.query.all()
    for message in messages:
        mentioned_users = find_mentioned_users(message.content, message.project.members)
        if mentioned_users:
            current_user = message.user
            mention_notifications = create_mention_notifications(message, mentioned_users, current_user)
            db.session.add_all(mention_notifications)
            db.session.commit()
            for user in mentioned_users:
                if user.notify_email:
                    send_email(
                        "You were mentioned in a project message",
                        [user.email],
                        "",
                        f"{current_user.username} mentioned you: {message.content}"
                    )

@message_bp.route('/projects/<int:project_id>/messages', methods=['POST'])
@jwt_required()
def post_message(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({'msg': 'Content required'}), 400
    message = Message(content=content, user_id=user_id, project_id=project_id)
    db.session.add(message)
    db.session.commit()
    
    # Get the current user who sent the message
    current_user = message.user
    
    # Extract mentions and create mention notifications
    mentioned_users = find_mentioned_users(content, project.members)
    mentioned_user_ids = []
    if mentioned_users:
        # Create mention notifications using the utility function
        mention_notifications = create_mention_notifications(message, mentioned_users, current_user)
        mentioned_user_ids = [user.id for user in mentioned_users]
        # Mention notifications are already added to session in the utility function
    
    # Notify other members about the new project message (except sender and mentioned users)
    for member in project.members:
        if member.id != user_id and member.id not in mentioned_user_ids:
            note = Notification(
                user_id=member.id,
                message=f"New message in project '{project.name}': {content[:50]}{'...' if len(content) > 50 else ''}",
                project_id=project_id,
                message_id=message.id,
                notification_type='general'
            )
            db.session.add(note)
            if member.notify_email:
                send_email("New Project Message", [member.email], "", f"{current_user.username}: {content}")
    db.session.commit()
    return jsonify({'msg': 'Message posted'}), 201
