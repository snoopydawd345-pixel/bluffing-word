import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('Word Bluff render error:', error); }
  render() {
    if (this.state.error) return <main className="shell"><section className="panel"><h1>Word Bluff hit a snag.</h1><p className="panel-copy">{this.state.error.message}</p></section></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>,
);
