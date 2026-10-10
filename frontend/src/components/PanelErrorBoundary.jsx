import React from 'react';
import { removeBootLoader } from '../lib/boot-loader';
export default class PanelErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(){removeBootLoader();}
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="admin-login-wrap"><section className="admin-login" role="alert"><h1>Panel load nahi ho paaya</h1><p className="hint">Page reload karke dobara try karein. Agar dikkat rahe, support ko batayein.</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Reload panel</button><a className="btn btn-soft" href="/">Back to home</a></section></div>;
  }
}
