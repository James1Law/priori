import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar, { MODULE_ITEMS, COMING_SOON_ITEMS, getActiveModule } from '../../src/components/Sidebar'

const renderSidebar = (props: Partial<Parameters<typeof Sidebar>[0]> = {}, route = '/s/test-session') => {
  const defaultProps = {
    slug: 'test-session',
    sessionName: 'Sprint Planning Q2',
    collapsed: false,
    onToggleCollapse: vi.fn(),
    ...props,
  }
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Sidebar {...defaultProps} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  describe('Expanded state', () => {
    it('renders all active module nav items with labels', () => {
      renderSidebar()

      expect(screen.getByTestId('sidebar-nav-backlog')).toHaveTextContent('Backlog')
      expect(screen.getByTestId('sidebar-nav-roadmap')).toHaveTextContent('Roadmap')
      expect(screen.getByTestId('sidebar-nav-capacity')).toHaveTextContent('Capacity Planning')
      expect(screen.getByTestId('sidebar-nav-prioritise')).toHaveTextContent('Prioritisation')
      expect(screen.getByTestId('sidebar-nav-estimate')).toHaveTextContent('Poker Planner')
      expect(screen.getByTestId('sidebar-nav-import-export')).toHaveTextContent('Import / Export')
    })

    it('renders Coming Soon items with Soon badge', () => {
      renderSidebar()

      expect(screen.getByTestId('sidebar-nav-sprints')).toHaveTextContent('Sprints')
      expect(screen.getByTestId('sidebar-nav-analytics')).toHaveTextContent('Analytics')
      expect(screen.getByTestId('sidebar-nav-integrations')).toHaveTextContent('Integrations')
      expect(screen.getByTestId('sidebar-nav-dashboards')).toHaveTextContent('Dashboards')
    })

    it('renders session name', () => {
      renderSidebar({ sessionName: 'My Sprint' })

      expect(screen.getByText('My Sprint')).toBeInTheDocument()
    })

    it('renders Settings in footer', () => {
      renderSidebar()

      expect(screen.getByTestId('sidebar-nav-settings')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('shows placeholder when session name is null', () => {
      renderSidebar({ sessionName: null })

      expect(screen.getByText('Name your session...')).toBeInTheDocument()
    })
  })

  describe('Collapsed state', () => {
    it('hides text labels when collapsed', () => {
      renderSidebar({ collapsed: true })

      // Module labels should not be visible
      expect(screen.queryByText('Backlog')).not.toBeInTheDocument()
      expect(screen.queryByText('Roadmap')).not.toBeInTheDocument()
      expect(screen.queryByText('Prioritisation')).not.toBeInTheDocument()
    })

    it('hides session name when collapsed', () => {
      renderSidebar({ collapsed: true, sessionName: 'My Sprint' })

      expect(screen.queryByText('My Sprint')).not.toBeInTheDocument()
    })

    it('sets title attribute for tooltips when collapsed', () => {
      renderSidebar({ collapsed: true })

      expect(screen.getByTestId('sidebar-nav-backlog')).toHaveAttribute('title', 'Backlog')
      expect(screen.getByTestId('sidebar-nav-roadmap')).toHaveAttribute('title', 'Roadmap')
    })
  })

  describe('Toggle', () => {
    it('calls onToggleCollapse when toggle button clicked', () => {
      const onToggleCollapse = vi.fn()
      renderSidebar({ onToggleCollapse })

      fireEvent.click(screen.getByTestId('sidebar-toggle'))

      expect(onToggleCollapse).toHaveBeenCalledOnce()
    })
  })

  describe('Active state', () => {
    it('highlights Backlog when on root route', () => {
      renderSidebar({}, '/s/test-session')

      expect(screen.getByTestId('sidebar-nav-backlog').className).toContain('bg-indigo-50')
    })

    it('highlights Roadmap when on roadmap route', () => {
      renderSidebar({}, '/s/test-session/roadmap')

      expect(screen.getByTestId('sidebar-nav-roadmap').className).toContain('bg-indigo-50')
    })

    it('highlights Capacity when on capacity route', () => {
      renderSidebar({}, '/s/test-session/capacity')

      expect(screen.getByTestId('sidebar-nav-capacity').className).toContain('bg-indigo-50')
    })

    it('highlights Prioritisation when on prioritise route', () => {
      renderSidebar({}, '/s/test-session/prioritise')

      expect(screen.getByTestId('sidebar-nav-prioritise').className).toContain('bg-indigo-50')
    })

    it('highlights Poker Planner when on estimate route', () => {
      renderSidebar({}, '/s/test-session/estimate')

      expect(screen.getByTestId('sidebar-nav-estimate').className).toContain('bg-indigo-50')
    })

    it('highlights Import / Export when on import-export route', () => {
      renderSidebar({}, '/s/test-session/import-export')

      expect(screen.getByTestId('sidebar-nav-import-export').className).toContain('bg-indigo-50')
    })
  })

  describe('Coming Soon items are not clickable', () => {
    it('Coming Soon items do not have onClick handlers', () => {
      renderSidebar()

      // Coming Soon items are divs, not buttons
      const sprints = screen.getByTestId('sidebar-nav-sprints')
      expect(sprints.tagName).not.toBe('BUTTON')
    })
  })
})

describe('getActiveModule', () => {
  it('returns backlog for root path', () => {
    expect(getActiveModule('/s/my-slug')).toBe('backlog')
  })

  it('returns roadmap for roadmap path', () => {
    expect(getActiveModule('/s/my-slug/roadmap')).toBe('roadmap')
  })

  it('returns capacity for capacity path', () => {
    expect(getActiveModule('/s/my-slug/capacity')).toBe('capacity')
  })

  it('returns prioritise for prioritise path', () => {
    expect(getActiveModule('/s/my-slug/prioritise')).toBe('prioritise')
  })

  it('returns estimate for estimate path', () => {
    expect(getActiveModule('/s/my-slug/estimate')).toBe('estimate')
  })

  it('returns import-export for import-export path', () => {
    expect(getActiveModule('/s/my-slug/import-export')).toBe('import-export')
  })
})

describe('Module and Coming Soon item counts', () => {
  it('has 6 active modules', () => {
    expect(MODULE_ITEMS).toHaveLength(6)
  })

  it('has 4 Coming Soon items', () => {
    expect(COMING_SOON_ITEMS).toHaveLength(4)
  })

  it('all Coming Soon items are disabled', () => {
    COMING_SOON_ITEMS.forEach(item => {
      expect(item.disabled).toBe(true)
    })
  })
})
