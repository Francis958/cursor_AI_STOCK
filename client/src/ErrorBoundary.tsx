import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px' }}>
          <h1 style={{ color: '#b91c1c' }}>Options Dashboard 加载出错</h1>
          <pre style={{ background: '#fef2f2', padding: '1rem', overflow: 'auto', fontSize: '14px' }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: '#666' }}>请打开 F12 → Console 查看完整报错，并确认后端已启动（端口 3001）。</p>
        </div>
      );
    }
    return this.props.children;
  }
}
