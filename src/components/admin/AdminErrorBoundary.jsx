import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'אירעה שגיאה בפאנל הניהול.',
    };
  }

  componentDidCatch(error, info) {
    console.error('Admin panel render error:', error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-amber-700">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-slate-950">שגיאה בפאנל הניהול</h1>
          <p className="mt-2 text-sm text-slate-600">
            המסך הנוכחי נתקל בשגיאה ולא נטען כראוי. אפשר לרענן את המסך או לעבור לאזור אחר בפאנל.
          </p>
          {this.state.message && (
            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
              {this.state.message}
            </p>
          )}
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 bg-blue-600 text-white hover:bg-blue-700"
          >
            <RefreshCw className="ml-2 h-4 w-4" aria-hidden="true" />
            רענון המסך
          </Button>
        </div>
      </div>
    );
  }
}
