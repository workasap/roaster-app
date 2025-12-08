"use client";

import type { ReactNode } from "react";
import { Component } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-red-700">Something went wrong</h2>
          <p className="mt-1 text-sm text-slate-600">Please refresh the page or try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
