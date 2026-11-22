import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginGate from './LoginGate'

describe('LoginGate', () => {
  it('shows the content to logged-in members', () => {
    render(<LoginGate allowed loading={false} onLogin={() => {}}><p>Leyndó</p></LoginGate>)
    expect(screen.getByText('Leyndó')).toBeInTheDocument()
  })

  it('asks guests to log in instead of showing the content', () => {
    const onLogin = vi.fn()
    render(<LoginGate allowed={false} loading={false} onLogin={onLogin}><p>Leyndó</p></LoginGate>)
    expect(screen.queryByText('Leyndó')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Innskrá' }))
    expect(onLogin).toHaveBeenCalled()
  })

  it('shows neither while auth is still loading', () => {
    render(<LoginGate allowed={false} loading onLogin={() => {}}><p>Leyndó</p></LoginGate>)
    expect(screen.queryByText('Leyndó')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Innskrá' })).not.toBeInTheDocument()
  })

  it('shows the auth error', () => {
    render(<LoginGate allowed={false} loading={false} onLogin={() => {}} error="Þú hefur ekki aðgang."><p>x</p></LoginGate>)
    expect(screen.getByRole('alert')).toHaveTextContent('Þú hefur ekki aðgang.')
  })
})
