import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    try {
      // Use the same base URL as the API
      const socketUrl = 'http://localhost:5000';
      const token = localStorage.getItem('access_token');
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        withCredentials: true,
        auth: {
          token: token
        },
        extraHeaders: {
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });

      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.isConnected = true;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;
        
        // Auto-reconnect on disconnect unless it was manual
        if (reason !== 'io client disconnect') {
          setTimeout(() => {
            if (!this.isConnected) {
              console.log('Attempting to reconnect...');
              this.connect();
            }
          }, 3000);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        
        // Fallback to polling if websocket fails
        if (this.socket.io.opts.transports.includes('websocket')) {
          console.log('Websocket failed, trying polling transport...');
          this.socket.io.opts.transports = ['polling'];
          setTimeout(() => this.connect(), 1000);
        }
      });

      // Handle connection confirmation
      this.socket.on('connected', (data) => {
        console.log('Socket authentication successful:', data);
      });

      this.socket.on('auth_error', (error) => {
        console.error('Socket authentication failed:', error);
      });

      // Handle real-time notifications
      this.socket.on('notification', (notification) => {
        console.log('Received notification:', notification);
        this.showNotification(notification);
      });

      // Handle task updates
      this.socket.on('task_updated', (taskData) => {
        console.log('Task updated:', taskData);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('taskUpdated', { detail: taskData }));
      });

      // Handle project updates
      this.socket.on('project_updated', (projectData) => {
        console.log('Project updated:', projectData);
        window.dispatchEvent(new CustomEvent('projectUpdated', { detail: projectData }));
      });

      // Handle new messages
      this.socket.on('new_message', (messageData) => {
        console.log('New message:', messageData);
        window.dispatchEvent(new CustomEvent('newMessage', { detail: messageData }));
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  addEventListener(event, callback) {
    this.on(event, callback);
  }

  removeEventListener(event, callback) {
    if (this.socket && callback) {
      this.socket.off(event, callback);
      // Remove from listeners map if it matches
      if (this.listeners.get(event) === callback) {
        this.listeners.delete(event);
      }
    } else {
      this.off(event);
    }
  }

  joinRoom(roomId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', { room: roomId });
    }
  }

  leaveRoom(roomId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', { room: roomId });
    }
  }

  sendMessage(roomId, message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', {
        room: roomId,
        message: message
      });
    }
  }

  showNotification(notification) {
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'SynergySphere Notification', {
        body: notification.message || notification.content,
        icon: '/favicon.ico',
        tag: notification.id || 'synergy-notification'
      });
    }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else {
          console.log('Notification permission denied');
        }
      });
    }
  }

  isSocketConnected() {
    return this.socket && this.isConnected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
