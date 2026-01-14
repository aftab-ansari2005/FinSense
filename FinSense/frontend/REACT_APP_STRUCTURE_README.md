# FinSense Frontend - React Application Structure

## Overview

This document describes the React application structure for the FinSense Financial Health Prediction System. The frontend is built with React, TypeScript, React Router, and Tailwind CSS.

## Architecture

### Technology Stack

- **React 18.2**: UI library
- **TypeScript 4.9**: Type-safe JavaScript
- **React Router 6.20**: Client-side routing
- **Tailwind CSS 3.3**: Utility-first CSS framework
- **Axios 1.6**: HTTP client for API calls
- **Recharts 2.8**: Charting library (for future visualizations)

### Project Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper with navbar
│   ├── Navbar.tsx      # Navigation bar component
│   └── ProtectedRoute.tsx  # Route guard for authentication
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state management
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   ├── LoginPage.tsx   # User login
│   ├── RegisterPage.tsx # User registration
│   ├── DashboardPage.tsx # Main dashboard
│   ├── TransactionsPage.tsx # Transaction list
│   ├── PredictionsPage.tsx # Prediction visualizations
│   └── UploadPage.tsx  # CSV file upload
├── services/           # API and business logic
│   ├── api.service.ts  # Axios instance with interceptors
│   └── auth.service.ts # Authentication API calls
├── types/              # TypeScript type definitions
│   └── auth.types.ts   # Authentication types
├── utils/              # Utility functions
├── App.tsx             # Main app component with routing
└── index.tsx           # Application entry point
```

## Key Features Implemented

### 1. Authentication System

**JWT-based Authentication**
- Login and registration flows
- Token storage in localStorage
- Automatic token refresh on 401 responses
- Secure logout functionality

**AuthContext**
- Centralized authentication state management
- User information access throughout the app
- Loading states for async operations

**Protected Routes**
- Route guards for authenticated pages
- Automatic redirect to login for unauthenticated users
- Preserve intended destination after login

### 2. Routing Structure

```
Public Routes:
  / - Home page (landing page)
  /login - User login
  /register - User registration

Protected Routes (require authentication):
  /dashboard - Main dashboard
  /transactions - Transaction list
  /predictions - Financial predictions
  /upload - CSV file upload
```

### 3. API Integration

**API Service**
- Centralized Axios instance
- Request interceptor for adding auth tokens
- Response interceptor for token refresh
- Automatic retry on 401 errors

**Auth Service**
- Login, register, logout methods
- Token management
- Current user retrieval

### 4. UI Components

**Layout Component**
- Consistent page structure
- Navbar integration
- Responsive container

**Navbar Component**
- Responsive navigation menu
- Mobile hamburger menu
- User menu with logout
- Conditional rendering based on auth state

**Page Components**
- HomePage: Landing page with features
- LoginPage: User authentication
- RegisterPage: New user signup
- DashboardPage: Main dashboard (placeholder)
- TransactionsPage: Transaction list (placeholder)
- PredictionsPage: Predictions view (placeholder)
- UploadPage: File upload (placeholder)

### 5. Styling

**Tailwind CSS Configuration**
- Custom color palette (primary, success, warning, danger)
- Custom animations (fade-in, slide-up)
- Responsive breakpoints
- Custom font family

**Design System**
- Consistent spacing and sizing
- Responsive grid layouts
- Shadow and border utilities
- Color-coded status indicators

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ML_SERVICE_URL=http://localhost:5001
```

### TypeScript Configuration

Path aliases configured in `tsconfig.json`:
- `@/*` - src directory
- `@/components/*` - components directory
- `@/services/*` - services directory
- `@/utils/*` - utils directory
- `@/types/*` - types directory

## Usage

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Authentication Flow

1. User visits protected route
2. ProtectedRoute checks authentication status
3. If not authenticated, redirect to /login
4. User logs in with credentials
5. AuthService stores tokens in localStorage
6. User redirected to intended destination
7. API calls automatically include auth token
8. Token refresh handled automatically on expiration

### Adding New Protected Routes

```typescript
<Route
  path="/new-route"
  element={
    <ProtectedRoute>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

### Using Authentication in Components

```typescript
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.firstName}!</p>}
    </div>
  );
};
```

### Making API Calls

```typescript
import api from '@/services/api.service';

// GET request
const response = await api.get('/transactions');

// POST request
const response = await api.post('/transactions/upload', formData);

// Auth token automatically included in headers
```

## Next Steps

The following features will be implemented in upcoming tasks:

1. **File Upload Component** (Task 13.2)
   - Drag-and-drop CSV upload
   - Upload progress tracking
   - File validation

2. **Dashboard Visualizations** (Task 14.1)
   - Balance display
   - Spending trends charts
   - Category breakdown

3. **Prediction Visualization** (Task 14.3)
   - Time-series charts with Recharts
   - Confidence intervals
   - Historical vs predicted data

4. **Real-time Updates** (Task 15.1)
   - WebSocket integration
   - Live data updates
   - Notification system

## Testing

### Unit Tests

Test files should be created alongside components:
- `ComponentName.test.tsx`
- Use React Testing Library
- Test user interactions and rendering

### Integration Tests

- Test authentication flows
- Test protected route access
- Test API integration

## Security Considerations

1. **Token Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
2. **XSS Protection**: React's built-in XSS protection
3. **CSRF Protection**: Token-based auth mitigates CSRF
4. **HTTPS**: Use HTTPS in production
5. **Token Expiration**: Automatic refresh on 401 responses

## Performance Optimization

1. **Code Splitting**: React.lazy() for route-based splitting
2. **Memoization**: Use React.memo() for expensive components
3. **Lazy Loading**: Load components on demand
4. **Image Optimization**: Use appropriate formats and sizes

## Accessibility

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Add labels for screen readers
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Color Contrast**: Follow WCAG guidelines

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured correctly
2. **Token Refresh Loop**: Check token expiration logic
3. **Route Not Found**: Verify route paths in App.tsx
4. **Styling Issues**: Ensure Tailwind CSS is properly configured

## References

- [React Documentation](https://react.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
