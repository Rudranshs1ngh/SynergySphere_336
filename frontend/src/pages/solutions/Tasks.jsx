import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2,
  Star,
  Eye,
  LayoutDashboard
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, has_more: false });
  const [filters, setFilters] = useState({
    search: '',
    project_id: '',
    status: '',
    owner: ''
  });
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchTasks();
    fetchProjects();

    const loadingUnsubscribe = loadingState.subscribe('tasks-get-all', (isLoading) => {
      setLoading(isLoading);
    });

    // Add focus listener to refresh data when returning to this view
    // Reason: Ensures data stays synchronized when switching between list and board views
    const handleFocus = () => {
      fetchTasks();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      loadingUnsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [filters, pagination.offset]);

  const fetchTasks = async () => {
    try {
      // Fetch regular tasks with filters
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      // Remove empty filters and "all" values
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === 'all') delete params[key];
      });

      const response = await taskAPI.getAllTasks(params);
      
      // Handle new API response structure
      const tasksData = response.tasks || [];
      const paginationData = response.pagination || {
        total: 0,
        limit: pagination.limit,
        offset: pagination.offset,
        has_more: false
      };

      // Transform tasks to include isFavorite field (defaulting to false)
      // Reason: Ensure consistent data structure between list and board views
      const tasksWithFavorites = (Array.isArray(tasksData) ? tasksData : []).map(task => ({
        ...task,
        isFavorite: task.is_favorite || task.isFavorite || false
      }));
      
      setTasks(tasksWithFavorites);
      
      // Update pagination data
      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
        has_more: paginationData.has_more
      }));
      
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      const projectsData = response.projects || response || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleDelete = async (taskId, projectId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskAPI.deleteTask(taskId, projectId);
      fetchTasks();
      setError('');
    } catch (err) {
      setError('Failed to delete task: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTaskStatus(taskId, newStatus);
      fetchTasks();
      setError('');
    } catch (err) {
      setError('Failed to update task status: ' + (err.message || 'Unknown error'));
    }
  };

  const handleToggleFavorite = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newFavoriteStatus = !task.isFavorite;
      
      // Update local state immediately for responsive UI
      const updatedTasks = tasks.map(t => 
        t.id === taskId 
          ? { ...t, isFavorite: newFavoriteStatus }
          : t
      );
      setTasks(updatedTasks);

      // Update via API
      // Reason: Persist favorite status to backend so it's consistent across views
      try {
        await taskAPI.updateTaskFavorite(taskId, newFavoriteStatus);
      } catch (apiError) {
        console.warn('Backend favorite update not available, using local state only:', apiError);
      }
    } catch (error) {
      console.error('Failed to toggle task favorite:', error);
      // Revert the change on error
      const revertedTasks = tasks.map(t => 
        t.id === taskId 
          ? { ...t, isFavorite: !t.isFavorite }
          : t
      );
      setTasks(revertedTasks);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const isOverdue = (dateString, status) => {
    if (!dateString || status === 'Completed') return false;
    return new Date(dateString) < new Date();
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const loadMore = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Clock className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your project tasks
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            asChild
            className="flex items-center gap-2"
          >
            <Link to="/solutions/tasks/board">
              <LayoutDashboard className="h-4 w-4" />
              Board View
            </Link>
          </Button>
          <Button asChild size="lg" className="shadow-md">
            <Link to="/solutions/tasks/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">All Status</option>
                <option value="pending">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={filters.project_id}
                onChange={(e) => handleFilterChange('project_id', e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {Object.values(filters).some(filter => filter) 
                ? "Try adjusting your filters to see more tasks"
                : "Create your first task to get started"
              }
            </p>
            <Button asChild size="lg">
              <Link to="/solutions/tasks/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const overdueTask = isOverdue(task.due_date, task.status);
            
            return (
              <Link key={task.id} to={`/solutions/tasks/${task.id}`} className="block">
                <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  overdueTask ? 'border-red-500 bg-red-50/50 dark:bg-red-950/50' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2 mb-1">
                          {task.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getStatusVariant(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1">{task.status}</span>
                          </Badge>
                          {overdueTask && (
                            <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                              Overdue
                            </Badge>
                          )}
                          {task.isFavorite && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                              Favorite
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleToggleFavorite(task.id);
                          }}
                          className="p-1 h-8 w-8"
                          title={task.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          {task.isFavorite ? (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ) : (
                            <Star className="h-4 w-4 text-gray-400 hover:text-yellow-400" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.preventDefault()}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/solutions/tasks/edit/${task.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Task
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(task.id, task.project_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {task.description || 'No description provided'}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Project:</span>
                        <span className="font-medium">{getProjectName(task.project_id)}</span>
                      </div>

                      {task.due_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due Date:</span>
                          <span className={`font-medium ${overdueTask ? 'text-red-600' : ''}`}>
                            {formatDate(task.due_date)}
                          </span>
                        </div>
                      )}

                      {task.assigned_to && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Assigned to:</span>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(task.assigned_to_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-xs">{task.assigned_to_name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <Separator />

                  <CardFooter className="pt-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Created {new Date(task.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={task.status}
                          onValueChange={(newStatus) => handleUpdateStatus(task.id, newStatus)}
                        >
                          <SelectTrigger className="w-32 h-8" onClick={(e) => e.preventDefault()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Not Started</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {pagination.has_more && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Load More Tasks
          </Button>
        </div>
      )}
    </div>
  );
};

export default Tasks;
