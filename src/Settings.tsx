import {
  Button,
  ListItem,
  Modal,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  UnorderedList,
} from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { observer } from 'mobx-react-lite'
import { useState, type FormEvent } from 'react'

import { handleApiError } from './api'
import type { BlacklistFilterDto } from './client'
import { mailsControllerApplyBlacklist, usersControllerAddBlacklist } from './client'
import store from './store'

/** The blacklist criteria the API supports, each building a one-field filter. */
const CRITERIA = [
  {
    id: 'fromAddress',
    label: 'Sender address is',
    build: (value: string): BlacklistFilterDto => ({ from: { address: value } }),
  },
  {
    id: 'fromName',
    label: 'Sender name is',
    build: (value: string): BlacklistFilterDto => ({ from: { name: value } }),
  },
  {
    id: 'fromAddressIncludes',
    label: 'Sender address contains',
    build: (value: string): BlacklistFilterDto => ({ fromIncludes: { address: value } }),
  },
  {
    id: 'fromNameIncludes',
    label: 'Sender name contains',
    build: (value: string): BlacklistFilterDto => ({ fromIncludes: { name: value } }),
  },
  {
    id: 'subject',
    label: 'Subject is',
    build: (value: string): BlacklistFilterDto => ({ subject: value }),
  },
  {
    id: 'text',
    label: 'Body contains',
    build: (value: string): BlacklistFilterDto => ({ text: value }),
  },
  {
    id: 'folder',
    label: 'Delivered to folder',
    build: (value: string): BlacklistFilterDto => ({ folder: value }),
  },
] as const

type CriterionId = (typeof CRITERIA)[number]['id']

/** Human-readable conditions of a stored blacklist filter (all must match). */
function describeFilter(filter: Record<string, unknown>): Array<[string, string]> {
  const conditions: Array<[string, string]> = []
  for (const [key, value] of Object.entries(filter)) {
    if (key === 'from' || key === 'fromIncludes') {
      const verb = key === 'from' ? 'is' : 'contains'
      const sender = (value ?? {}) as Record<string, unknown>
      if (sender.address !== undefined) {
        conditions.push([`Sender address ${verb}`, String(sender.address)])
      }
      if (sender.name !== undefined) {
        conditions.push([`Sender name ${verb}`, String(sender.name)])
      }
    } else if (key === 'text') {
      conditions.push(['Body contains', String(value)])
    } else {
      // exact match on any other top-level mail field (subject, folder, domain, ...)
      const field = key.charAt(0).toUpperCase() + key.slice(1)
      conditions.push([`${field} is`, typeof value === 'string' ? value : JSON.stringify(value)])
    }
  }
  return conditions
}

/** User settings: account addresses and the incoming mail blacklist. */
const Settings = observer(function Settings() {
  const [criterion, setCriterion] = useState<CriterionId>('fromAddress')
  const [value, setValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmApply, setConfirmApply] = useState(false)
  const [applying, setApplying] = useState(false)

  const addresses = store.user.mails ?? []
  const filters = store.user.mailBlacklist ?? []

  async function addFilter(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    const selected = CRITERIA.find((item) => item.id === criterion)
    if (!trimmed || !selected) {
      return
    }
    setAdding(true)
    try {
      const { error } = await usersControllerAddBlacklist({
        body: { element: selected.build(trimmed) },
      })
      if (error) {
        handleApiError(error)
        store.showToast({ kind: 'error', title: 'Could not add the filter' })
        return
      }
      setValue('')
      store.showToast({ kind: 'success', title: 'Filter added', subtitle: 'New matching mails will be dropped.' })
      await store.getUserConfig()
    } catch (err) {
      console.error(err)
      store.showToast({ kind: 'error', title: 'Could not add the filter' })
    } finally {
      setAdding(false)
    }
  }

  async function applyBlacklist() {
    setApplying(true)
    try {
      const { data, error } = await mailsControllerApplyBlacklist()
      if (error) {
        handleApiError(error)
        store.showToast({ kind: 'error', title: 'Could not apply the blacklist' })
        return
      }
      const deleted = data?.deleted ?? 0
      store.showToast({
        kind: 'success',
        title: 'Blacklist applied',
        subtitle: `${deleted} ${deleted === 1 ? 'mail' : 'mails'} deleted.`,
      })
      store.getFolders()
    } catch (err) {
      console.error(err)
      store.showToast({ kind: 'error', title: 'Could not apply the blacklist' })
    } finally {
      setApplying(false)
      setConfirmApply(false)
    }
  }

  return (
    <div className="settings">
      <Stack gap={8} className="settings-content">
        <h1>Settings</h1>

        <Stack as="section" gap={5}>
          <h2>Account</h2>
          {addresses.length > 0 ? (
            <UnorderedList>
              {addresses.map((mail) => (
                <ListItem key={`${mail.name}@${mail.domain}`}>
                  {mail.name}@{mail.domain}
                </ListItem>
              ))}
            </UnorderedList>
          ) : (
            <p className="settings-help">No mail address configured.</p>
          )}
        </Stack>

        <Stack as="section" gap={5}>
          <h2>Blacklist</h2>
          <p className="settings-help">
            Incoming mails matching any of these filters are dropped on arrival.
          </p>

          <Table size="md" aria-label="Blacklist filters">
            <TableHead>
              <TableRow>
                <TableHeader>Condition</TableHeader>
                <TableHeader>Value</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>No filters yet</TableCell>
                </TableRow>
              )}
              {filters.map((filter, index) => {
                const conditions = describeFilter(filter)
                return (
                  <TableRow key={index}>
                    <TableCell>{conditions.map(([label]) => label).join(' and ')}</TableCell>
                    <TableCell>{conditions.map(([, text]) => text).join(', ')}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <form className="settings-blacklist-form" onSubmit={addFilter}>
            <Select
              id="blacklist-criterion"
              labelText="Condition"
              value={criterion}
              onChange={(event) => setCriterion(event.target.value as CriterionId)}
            >
              {CRITERIA.map((item) => (
                <SelectItem key={item.id} value={item.id} text={item.label} />
              ))}
            </Select>
            <TextInput
              id="blacklist-value"
              labelText="Value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="submit" renderIcon={Add} disabled={adding || !value.trim()}>
              Add filter
            </Button>
          </form>

          <div>
            <Button
              kind="danger--tertiary"
              renderIcon={TrashCan}
              disabled={filters.length === 0}
              onClick={() => setConfirmApply(true)}
            >
              Delete matching mails
            </Button>
          </div>
        </Stack>
      </Stack>

      <Modal
        danger
        open={confirmApply}
        modalHeading="Delete matching mails?"
        primaryButtonText="Delete mails"
        secondaryButtonText="Cancel"
        loadingStatus={applying ? 'active' : 'inactive'}
        loadingDescription="Deleting mails…"
        onRequestClose={() => setConfirmApply(false)}
        onRequestSubmit={applyBlacklist}
      >
        <p>
          Every received mail matching a blacklist filter will be permanently deleted. This cannot
          be undone.
        </p>
      </Modal>
    </div>
  )
})

export default Settings
