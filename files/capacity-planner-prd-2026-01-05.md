# Executive Summary

The Capacity Planner is a web-based tool designed to streamline developer scheduling and project allocation. This MVP aims to recreate and improve upon the core functionality of Hello Time, providing a visual and intuitive interface for managing team member availability and project assignments. The platform will enable administrators to efficiently schedule developer work, create and assign projects, and display allocation visually on a calendar, ensuring optimal resource utilization and project timelines.

The MVP will focus on core features, including user authentication, employee and project management, and calendar-based scheduling. Key functionalities include assigning work days, managing annual leave, allocating projects to users, and providing visual cues like color-coded projects. User roles (Guest, Registered User, and Administrator) ensure secure and appropriate access levels. The Capacity Planner aims to deliver a streamlined experience to facilitate efficient project planning and resource management.

## Platforms

- **Web**: React
- **API**: Laravel
- **Database**: MySQL
- **Styling**: Tailwind CSS
- **UI/UX**: shadcn/ui
- **Admin Panel**: Filament
- **Backend**: Laravel
- **Frontend Integration**: Inertia.js

## User Types

- **Guest**: Unauthenticated visitor with read-only access to public information. Cannot create or modify any data.
- **Registered User**: Authenticated user with basic access to the system. Can view project allocations and manage their own profile.
- **Administrator**: Authenticated user with administrative privileges. Can manage users, projects, and system settings, including annual leave and allocations.

## Feature Groups

- Uncategorised
- User Authentication & Management
- Employee Management
- Project Management
- Calendar Visualisation
- Work Allocation & Scheduling
- Calendar Event Markers
- Annual Leave Management


---

# Feature Specifications

Detailed specifications for each feature group:

### Uncategorised

This feature group serves as a default container for functionalities that don't naturally fit into other defined categories within the Capacity Planner. It ensures that all features have a designated place, even if their purpose is broad or cross-cutting.

- **Tasks** (functional requirements only, ordered by user type):
  - No tasks defined.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified.

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified.

- **Potential Dependencies**:
  - No external dependencies identified based on current requirements.


### User Authentication & Management

This feature group provides the core functionality for users to create and manage their accounts, including registration, login, password management, and account security. It serves all users of the system, ensuring secure access and personalized experiences.

- **Tasks** (functional requirements only, ordered by user type):
  - Guests can register for an account.
  - Users can log in to their account.
  - Users can manage their password.
  - Users can recover their password.
  - Users can toggle password visibility during input.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - No external dependencies identified based on current requirements


### Employee Management

This feature group provides administrators with the ability to manage employee information within the system. This includes adding, editing, and soft deleting employee profiles, as well as assigning work days, managing annual leave, and controlling employee visibility in the calendar. This allows for accurate capacity planning and resource allocation.

- **Tasks** (functional requirements only, ordered by user type):
  - Admins can add employees.
  - Admins can edit employee information.
  - Admins can soft delete employees.
  - Admins can assign work days to employees.
  - Admins can manage employee annual leave, including default allocation.
  - Admins can bulk add employee annual leave.
  - Admins can control employee visibility in the calendar.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - User Authentication & Management (for admin login)
  - Annual Leave Management
  - Calendar Visualisation


### Project Management

This feature group allows administrators to manage projects within the capacity planning system. It includes the ability to add, edit, and soft delete projects, allocate projects to users, control project visibility, and assign colors for calendar identification. This helps administrators organize and track projects effectively.

- **Tasks** (functional requirements only, ordered by user type):
  - Admins can add projects.
  - Admins can edit projects.
  - Admins can soft delete projects.
  - Admins can allocate projects to users.
  - Admins can control project visibility in user side panels.
  - Admins can assign colours to projects for calendar identification.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - User Authentication & Management feature group (for identifying and authenticating administrators).
  - Employee Management feature group (for allocating projects to users).
  - Calendar Visualisation feature group (for calendar identification using colors).


### Calendar Visualisation

This feature group provides users with a visual representation of capacity planning data through a calendar interface. It allows users to view schedules by date range (daily, weekly, monthly), navigate through time, and switch between viewing information by person or project, enhancing the user’s ability to understand resource allocation.

- **Tasks** (functional requirements only, ordered by user type):
  - Users can view the calendar in daily, weekly, or monthly views.
  - Users can navigate the calendar to view different date ranges.
  - Users can switch between a "people" view and a "project" view.
  - Users can hide or display projects under employee dropdowns.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - Employee Management
  - Project Management
  - Work Allocation & Scheduling


### Work Allocation & Scheduling

This feature group provides the ability to schedule developer work and allocate time to different projects. It allows for a visual representation of work allocation, enabling efficient resource management and project planning. This benefits project managers and developers by providing a clear overview of workload and deadlines.

- **Tasks** (functional requirements only, ordered by user type):
  - Users can schedule developer work.
  - Users can allocate days per week to projects.
  - Users can add details to calendar cells (title, date range, days allocated).
  - Users can drag blocks to adjust time.
  - Users can manage blocks within the calendar.
  - Users can allocate time to generic SLA or miscellaneous blocks.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified.

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified.

- **Potential Dependencies**:
  - Calendar Visualisation
  - Employee Management
  - Project Management


### Calendar Event Markers

This feature provides users with the ability to create and manage custom calendar entries, visually distinct from regular calendar events. It enables them to highlight project end dates or upcoming events for better project tracking and visibility.

- **Tasks** (functional requirements only, ordered by user type):
  - Users can add custom calendar entries with a distinct color/style.
  - Users can add a title and description to custom calendar entries.
  - Users can view the title/description of custom calendar entries on hover.
  - Users can manage (edit/delete) their custom calendar entries.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - Calendar Visualisation


### Annual Leave Management

This feature provides administrators with the tools to manage employee annual leave allocations. It supports default allocations, project allocation warnings during leave periods, and the ability to add leave in bulk, allowing for efficient management of employee time off.

- **Tasks** (functional requirements only, ordered by user type):
  - [No tasks for unauthenticated/guest users]
  - [No tasks for regular users]
  - Admins can allocate default annual leave.
  - Admins can see warnings for project allocation during employee leave.
  - Admins can add leave in bulk.

- **Non-Functional Requirements**:
  - No specific non-functional requirements identified

- **Technical & Security Considerations**:
  - No specific technical or security considerations identified

- **Potential Dependencies**:
  - Employee Management (for employee data)
  - Project Management (for project allocation data)