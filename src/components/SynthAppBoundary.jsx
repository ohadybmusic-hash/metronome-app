import { Component } from 'react'

/**
 * Catches render errors from the embedded synth so the metronome shell stays usable.
 */
export default class SynthAppBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  render() {
    if (this.state.err) {
      return (
        <div className="rounded-2xl border border-hairline bg-surface-container-low p-6 text-left">
          <p className="text-sm font-medium text-on-surface">Synth lab had a problem</p>
          <p className="mt-2 text-xs text-on-surface-variant leading-relaxed">
            {String(this.state.err?.message || this.state.err)}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
