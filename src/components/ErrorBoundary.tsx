/**
 * ErrorBoundary.tsx
 *
 * React Error Boundary component for catching JavaScript errors in component trees
 * Provides fallback UI and error logging
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText } from "@ionic/react";
import { errorHandler } from "../utils/errorHandler";
import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to our error handler
    errorHandler.handleException(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <IonCard className="error-boundary-card">
          <IonCardHeader>
            <IonCardTitle>Something went wrong</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonText>
              <p>We're sorry, but something unexpected happened. The error has been logged and our team will look into it.</p>
            </IonText>
            {this.state.error && (
              <IonText color="medium">
                <p style={{ fontSize: "0.8em", marginTop: "1rem" }}>
                  Error: {this.state.error.message}
                </p>
              </IonText>
            )}
            <IonButton expand="block" onClick={this.handleReset} style={{ marginTop: "1rem" }}>
              Try Again
            </IonButton>
          </IonCardContent>
        </IonCard>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;