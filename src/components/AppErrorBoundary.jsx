import { Component } from 'react'

/**
 * Last-resort UI when the main shell throws during render (avoids an empty #root on a dark canvas background).
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  componentDidCatch(err, info) {
    console.error('[AppErrorBoundary]', err, info?.componentStack)
  }

  render() {
    if (this.state.err) {
      const msg = String(this.state.err?.message || this.state.err)
      return (
        <div
          className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6 text-center font-body-md text-on-background"
          role="alert"
        >
          <h1 className="text-lg font-semibold text-chrome">Something went wrong</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">{msg}</p>
          <button
            type="button"
            className="mt-6 rounded-ds-lg border border-hairline bg-surface-container-low px-4 py-2 text-sm font-semibold text-chrome"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
