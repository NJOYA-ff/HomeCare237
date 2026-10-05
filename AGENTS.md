# HomeCare237 Development Guidelines

## Project Overview

HomeCare237 is a professional healthcare platform designed for the Cameroonian market, providing telemedicine, appointment booking, medication management, and emergency care services.

## Architecture

### Technology Stack
- **Frontend**: React 19, Ionic React, TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage), Express.js
- **Real-time Communication**: Twilio Video/Voice SDK
- **State Management**: React Query, Context API
- **Payment**: Mobile Money (MTN MoMo, Orange Money)
- **AI/ML**: Google Gemini for health education
- **Mobile**: Capacitor for Android/iOS

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── Family/         # Family account management
│   ├── Payment/        # Payment processing
│   ├── Services/       # Business logic services
│   ├── telehealth/     # Video/telehealth components
│   └── ui/            # Design system components
├── context/           # React Context providers
├── hooks/             # Custom React hooks
├── pages/             # Page components
│   ├── Patient/       # Patient-facing pages
│   ├── Doctor/        # Doctor-facing pages
│   ├── Admin/         # Admin-facing pages
│   └── Settings/      # Settings pages
├── services/          # External service integrations
├── theme/             # Styling and theming
├── utils/             # Utility functions
└── firebaseconfig.ts  # Firebase configuration
```

## Development Standards

### Code Style
- Use TypeScript for all new files
- Follow functional programming patterns
- Prefer custom hooks over class components
- Use const/let instead of var
- Use template literals for string interpolation
- Keep functions under 50 lines when possible
- Extract complex logic into separate utilities

### File Naming
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `securityUtils.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useAppointmentBooking.ts`)
- Services: camelCase (e.g., `momoPaymentService.ts`)
- Styles: ComponentName.css or ComponentName.scss

### Component Guidelines
- Keep components focused on single responsibility
- Use TypeScript interfaces for props
- Add JSDoc comments for complex functions
- Implement proper error boundaries
- Use loading states for async operations
- Add accessibility attributes (ARIA labels, keyboard navigation)

### State Management
- Use React Query for server state (API calls, Firestore)
- Use Context API for global UI state
- Use local useState for component-specific state
- Avoid prop drilling - use context or custom hooks
- Implement proper cleanup in useEffect

### Firebase Usage
- Use Firestore for data persistence
- Implement offline-first with local caching
- Use Firebase Auth for authentication
- Use Firebase Storage for file uploads
- Implement proper error handling for Firebase operations

### Security Requirements
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Implement input validation and sanitization
- Use Firebase Security Rules for data access control
- Implement rate limiting for API calls
- Mask sensitive data in logs

### Healthcare Compliance
- Validate all medical data inputs
- Implement audit logging for patient data access
- Add consent management for data processing
- Follow HIPAA/GDPR guidelines for data handling
- Implement data retention policies
- Add right-to-be-forgotten functionality

### Performance Standards
- Implement code splitting for large components
- Use lazy loading for non-critical routes
- Optimize images and assets
- Implement caching strategies
- Monitor bundle sizes (target < 2MB total)
- Use performance monitoring tools

### Testing Requirements
- Write unit tests for utilities and services
- Add integration tests for critical flows
- Implement E2E tests for user journeys
- Target > 70% code coverage
- Test error scenarios and edge cases
- Use mock data for consistent testing

### Accessibility Standards
- Follow WCAG 2.1 AA guidelines
- Add ARIA labels for interactive elements
- Implement keyboard navigation
- Support screen readers
- Add high contrast mode support
- Test with accessibility tools

## Build Commands

### Development
```bash
npm run dev              # Start dev server (API + Vite)
npm run dev:web          # Start Vite only
npm run start:api        # Start API server only
```

### Production
```bash
npm run build           # Build for production
npm run preview         # Preview production build
```

### Testing
```bash
npm run test.unit       # Run unit tests
npm run test.e2e        # Run E2E tests with Cypress
npm run lint            # Run ESLint
```

### Mobile
```bash
npm run resources       # Generate app resources
npm run resources:all   # Generate all platform resources
```

## Environment Variables

Required environment variables (see `.env.example`):
- Firebase configuration (VITE_REACT_APP_FIREBASE_*)
- Twilio credentials (TWILIO_*)
- Gemini AI key (GEMINI_API_KEY) - **REQUIRED for AI features (pre-consultation triage, health tips)**
- API configuration (VITE_API_BASE_URL)

**Important**: To enable AI features, you need a valid Google Gemini API key from https://makersuite.google.com/app/apikey. Without it, the AI triage will show fallback recommendations.

## Deployment

### Web Deployment
1. Build the project: `npm run build`
2. Deploy `dist/` folder to web hosting
3. Configure environment variables for production
4. Set up Firebase Security Rules
5. Configure Firebase Hosting for web app

### Mobile Deployment
1. Build the project: `npm run build`
2. Add platforms: `npx cap add android` / `npx cap add ios`
3. Sync: `npx cap sync`
4. Build native apps: `npx cap open android` / `npx cap open ios`
5. Configure native app signing
6. Submit to app stores

## Monitoring and Observability

### Performance Monitoring
- Use built-in monitoring utilities
- Track API response times
- Monitor error rates
- Track user behavior patterns
- Set up alerts for critical issues

### Health Checks
- Firebase connectivity
- API server availability
- Browser performance
- Network latency
- Memory usage

## Troubleshooting

### Common Issues
1. **Firebase connection issues**: Check Firebase config and network connectivity
2. **Twilio video not working**: Verify API server is running and credentials are correct
3. **Build failures**: Check TypeScript errors and dependency versions
4. **Performance issues**: Check bundle sizes and implement code splitting
5. **Mobile build issues**: Verify Capacitor configuration and native dependencies

### Debug Mode
Set `VITE_DEBUG_MODE=true` in `.env` to enable debug logging.

## Code Review Checklist

- [ ] Code follows project structure and naming conventions
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Accessibility attributes are added
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed
- [ ] Tests are included for new functionality
- [ ] Documentation is updated
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials or sensitive data

## Contributing

1. Create a feature branch from `main`
2. Implement changes following these guidelines
3. Add tests for new functionality
4. Update documentation
5. Submit pull request with description
6. Address review feedback
7. Ensure CI/CD checks pass

## Resources

- [Ionic Documentation](https://ionicframework.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Twilio Documentation](https://www.twilio.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Support

For technical issues, contact the development team or check the project documentation in the `docs/` directory.