import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  parseImportCsv,
  mapImportStatus,
  markDuplicates,
} from '../../src/lib/importCsv'

// Real Jira export (List view → Export → CSV), including a quoted
// multi-line description with Jira wiki markup and an empty description
const JIRA_CSV = `Issue Type,Issue key,Issue id,Summary,Creator,Creator Id,Sprint,Status,Parent,Parent key,Parent summary,Description
Story,CR-7489,3239502,Promotion - onBOARD Promote & rank change execution,James Law,6316282b6856bdd60a9fad84,Crewing 2026 - Sprint 16,Ready for Refinement,3238589,CR-7433,Promotion Management v1,"*Title*: onBOARD Promote action and rank change execution

*As a* vessel Captain
*I want* the onBOARD Promote action to be available only once a seafarer is Approved for promotion, and to carry out the rank change on board
*So that* a promotion is executed deliberately and only after it has been fully approved

*Acceptance Criteria*

* The existing onBOARD Promote action is unavailable for a seafarer until they are Approved for promotion, consuming the status delivered by CR-7438
* When the seafarer is Approved for promotion, the Captain can select Promote onBOARD and carry out the in-place rank change on the vessel"
Story,CR-7083,3229565,[dashboards] patch up dashboard to support grafana 9,Nicolas.Chagrass,62979f219c88e7006fb5f640,,Ready for Refinement,3236788,CR-7329,2026 Q3 Maintenance,
`

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\nd,e,f')).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ])
  })

  it('handles quoted fields containing commas', () => {
    expect(parseCsv('a,"b, with comma",c')).toEqual([['a', 'b, with comma', 'c']])
  })

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCsv('a,"say ""hello""",c')).toEqual([['a', 'say "hello"', 'c']])
  })

  it('handles newlines inside quoted fields', () => {
    expect(parseCsv('a,"line one\nline two",c')).toEqual([['a', 'line one\nline two', 'c']])
  })

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('\uFEFF' + 'a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('skips empty trailing lines', () => {
    expect(parseCsv('a,b\n\n')).toEqual([['a', 'b']])
  })
})

describe('mapImportStatus', () => {
  it('maps done-like statuses to done', () => {
    expect(mapImportStatus('Done')).toBe('done')
    expect(mapImportStatus('Closed')).toBe('done')
    expect(mapImportStatus('Resolved')).toBe('done')
    expect(mapImportStatus('Released')).toBe('done')
  })

  it('maps active statuses to in_progress', () => {
    expect(mapImportStatus('In Progress')).toBe('in_progress')
    expect(mapImportStatus('In Development')).toBe('in_progress')
    expect(mapImportStatus('In Review')).toBe('in_progress')
    expect(mapImportStatus('In Testing')).toBe('in_progress')
  })

  it('maps unknown statuses to todo', () => {
    expect(mapImportStatus('Ready for Refinement')).toBe('todo')
    expect(mapImportStatus('Backlog')).toBe('todo')
    expect(mapImportStatus('To Do')).toBe('todo')
    expect(mapImportStatus('')).toBe('todo')
  })
})

describe('parseImportCsv — Jira format', () => {
  it('detects the Jira format', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.format).toBe('jira')
  })

  it('extracts one item per issue row', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items).toHaveLength(2)
  })

  it('prefixes titles with the issue key', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items[0].title).toBe('CR-7489 — Promotion - onBOARD Promote & rank change execution')
    expect(result.items[1].title).toBe('CR-7083 — [dashboards] patch up dashboard to support grafana 9')
  })

  it('keeps the issue key as sourceKey', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items[0].sourceKey).toBe('CR-7489')
    expect(result.items[1].sourceKey).toBe('CR-7083')
  })

  it('imports multi-line descriptions intact', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items[0].description).toContain('*As a* vessel Captain')
    expect(result.items[0].description).toContain('Acceptance Criteria')
  })

  it('imports empty description as null', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items[1].description).toBeNull()
  })

  it('maps Jira statuses to priori statuses', () => {
    const result = parseImportCsv(JIRA_CSV)
    expect(result.items[0].status).toBe('todo')
  })

  it('skips rows with an empty summary', () => {
    const csv = 'Issue key,Summary,Status\nCR-1,Real item,Done\nCR-2,,Done\n'
    const result = parseImportCsv(csv)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].sourceKey).toBe('CR-1')
  })
})

describe('parseImportCsv — generic format', () => {
  it('accepts a CSV with a Title column', () => {
    const csv = 'Title,Description\nFirst thing,Some detail\nSecond thing,\n'
    const result = parseImportCsv(csv)
    expect(result.format).toBe('generic')
    expect(result.items).toHaveLength(2)
    expect(result.items[0]).toMatchObject({
      title: 'First thing',
      description: 'Some detail',
      status: 'todo',
      sourceKey: null,
    })
  })

  it('accepts Name as the title column and maps a Status column', () => {
    const csv = 'Name,Status\nShip it,Done\n'
    const result = parseImportCsv(csv)
    expect(result.items[0].title).toBe('Ship it')
    expect(result.items[0].status).toBe('done')
  })

  it('is case-insensitive about headers', () => {
    const csv = 'TITLE,DESCRIPTION\nUpper case headers,works\n'
    const result = parseImportCsv(csv)
    expect(result.items[0].title).toBe('Upper case headers')
  })

  it('throws a helpful error when no title-like column exists', () => {
    expect(() => parseImportCsv('Foo,Bar\n1,2\n')).toThrowError(/title|summary/i)
  })

  it('throws on an empty file', () => {
    expect(() => parseImportCsv('')).toThrowError(/empty/i)
  })

  it('throws when there are headers but no data rows', () => {
    expect(() => parseImportCsv('Title,Description\n')).toThrowError(/no items/i)
  })
})

describe('markDuplicates', () => {
  const parsed = parseImportCsv(JIRA_CSV).items

  it('flags items whose Jira key already appears in an existing title', () => {
    const existing = [{ title: 'CR-7489 — Promotion - onBOARD Promote & rank change execution' }]
    const marked = markDuplicates(parsed, existing)
    expect(marked[0].isDuplicate).toBe(true)
    expect(marked[1].isDuplicate).toBe(false)
  })

  it('matches keys anywhere in existing titles', () => {
    const existing = [{ title: 'Dashboard patch (CR-7083)' }]
    const marked = markDuplicates(parsed, existing)
    expect(marked[0].isDuplicate).toBe(false)
    expect(marked[1].isDuplicate).toBe(true)
  })

  it('does not treat CR-708 as a match for CR-7083', () => {
    const existing = [{ title: 'CR-708 — something else entirely' }]
    const marked = markDuplicates(parsed, existing)
    expect(marked[1].isDuplicate).toBe(false)
  })

  it('flags exact title matches for items without a key', () => {
    const items = parseImportCsv('Title\nShip the thing\n').items
    const marked = markDuplicates(items, [{ title: 'ship the thing' }])
    expect(marked[0].isDuplicate).toBe(true)
  })

  it('flags nothing when the session is empty', () => {
    const marked = markDuplicates(parsed, [])
    expect(marked.every(i => i.isDuplicate === false)).toBe(true)
  })
})
