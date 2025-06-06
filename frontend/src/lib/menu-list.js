import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Settings,
  User,
  AlertTriangle,
  BarChart3,
  DollarSign
} from "lucide-react";

export function getMenuList(pathname) {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard",
        }
      ]
    },
    {
      groupLabel: "Solutions",
      menus: [
        {
          href: "/solutions/projects",
          label: "Projects",
          icon: FolderKanban,
          active: pathname.includes("/solutions/projects"),
          submenus: [
            {
              href: "/solutions/projects",
              label: "All Projects",
              active: pathname === "/solutions/projects"
            },
            {
              href: "/solutions/projects/create",
              label: "Create Project",
              active: pathname === "/solutions/projects/create"
            }
          ]
        },
        {
          href: "/solutions/tasks",
          label: "Tasks",
          icon: CheckSquare,
          active: pathname.includes("/solutions/tasks"),
          submenus: [
            {
              href: "/solutions/tasks",
              label: "All Tasks", 
              active: pathname === "/solutions/tasks"
            },
            {
              href: "/solutions/tasks/create",
              label: "Create Task",
              active: pathname === "/solutions/tasks/create"
            }
          ]
        },
        {
          href: "/solutions/InBox",
          label: "InBox",
          icon: CheckSquare,
          active: pathname.includes("/solutions/InBox"),
        }
        
      ]
    },
    {
      groupLabel: "Analytics & Finance",
      menus: [
        {
          href: "/analytics",
          label: "Analytics",
          icon: BarChart3,
          active: pathname.includes("/analytics"),
          submenus: []
        },
        {
          href: "/finance",
          label: "Finance",
          icon: DollarSign,
          active: pathname.includes("/finance"),
          submenus: []
        }
      ]
    },
    {
      groupLabel: "Account",
      menus: [
        {
          href: "/profile",
          label: "Profile",
          icon: User,
          active: pathname === "/profile"
        },
        {
          href: "/settings",
          label: "Settings", 
          icon: Settings,
          active: pathname === "/settings"
        }
      ]
    }
  ];
}
