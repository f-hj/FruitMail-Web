import { makeAutoObservable, runInAction } from 'mobx'

import { handleApiError } from './api'
import type {
  FolderDto,
  FoldersV2Dto,
  MailAddressDto,
  MailDto,
  UserConfigDto,
} from './client'
import {
  foldersControllerListFoldersV2,
  mailsControllerListMessagesByFolder,
  usersControllerUserConfig,
} from './client'
import { asArray } from './format'

export type MailCategory = 'new' | 'read' | 'done'

/**
 * A mail as returned by the server. The OpenAPI spec does not (yet) declare
 * every field the API sends; the extra optional fields below are used when
 * replying to a message.
 */
export interface Mail extends MailDto {
  to?: Array<MailAddressDto>
  cc?: Array<MailAddressDto>
  envelopeFrom?: MailAddressDto
  messageId?: string
  /** Raw message headers (`message-id`, `date`, ...), as parsed by the server. */
  headers?: Record<string, unknown>
}

/** User configuration; `defaultName` is sent by the server but not in the spec. */
export type UserConfig = Partial<UserConfigDto> & { defaultName?: string }

/** Folders grouped by read state, plus the sidebar-search-filtered copies. */
export interface Folders extends FoldersV2Dto {
  newP: Array<FolderDto>
  readP: Array<FolderDto>
  doneP: Array<FolderDto>
}

export function isMailCategory(value?: string): value is MailCategory {
  return value === 'new' || value === 'read' || value === 'done'
}

const COLLAPSED_STORAGE_KEY = 'fruitmail.collapsedCategories'

type CollapsedState = Record<MailCategory, boolean>

function loadCollapsedCategories(): CollapsedState {
  const collapsed: CollapsedState = { new: false, read: false, done: false }
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (raw) {
      Object.assign(collapsed, JSON.parse(raw) as Partial<CollapsedState>)
    }
  } catch {
    // missing or corrupted entry - start fully expanded
  }
  return collapsed
}

class Store {
  user: UserConfig = {}

  isGettingFolders = false
  folders: Folders = {
    new: [],
    read: [],
    done: [],
    newP: [],
    readP: [],
    doneP: [],
  }

  currentType: MailCategory = 'new'
  currentFolder = 'inbox'
  currentFolderMails: Array<Mail> = []

  /** Collapsed state of the sidebar category groups, persisted across reloads. */
  collapsed: CollapsedState = loadCollapsedCategories()

  constructor() {
    makeAutoObservable(this)
  }

  /** `Name <user@domain>` of the user's primary mail address. */
  get defaultMail(): string {
    if (!this.userMail) {
      return ''
    }
    return `${this.userName} <${this.userMail}>`.trim()
  }

  /** Display name of the user (falls back to the mailbox local part). */
  get userName(): string {
    const mail = this.user.mails?.[0]
    return this.user.defaultName ?? mail?.name ?? ''
  }

  /** Primary e-mail address of the user. */
  get userMail(): string {
    const mail = this.user.mails?.[0]
    return mail ? `${mail.name}@${mail.domain}` : ''
  }

  async getUserConfig(): Promise<void> {
    try {
      const { data, error } = await usersControllerUserConfig()
      if (error) {
        handleApiError(error)
        return
      }
      if (data) {
        runInAction(() => {
          this.user = data as UserConfig
        })
      }
    } catch (err) {
      // no connection - TODO: show a notification
      console.error('Failed to load user config:', err)
    }
  }

  async getFolders(): Promise<void> {
    this.isGettingFolders = true
    try {
      const { data, error } = await foldersControllerListFoldersV2()
      if (error) {
        handleApiError(error)
        return
      }
      if (data) {
        runInAction(() => {
          this.folders = {
            ...data,
            new: asArray(data.new),
            read: asArray(data.read),
            done: asArray(data.done),
            newP: asArray(data.new),
            readP: asArray(data.read),
            doneP: asArray(data.done),
          }
        })
      }
    } catch (err) {
      // no connection - TODO: show a notification
      console.error('Failed to load folders:', err)
    } finally {
      runInAction(() => {
        this.isGettingFolders = false
      })
    }
  }

  /** Filters the sidebar folder lists by name. */
  filterFolders(search: string): void {
    const matches = (folder: FolderDto) => folder.name.includes(search)
    this.folders.newP = this.folders.new.filter(matches)
    this.folders.readP = this.folders.read.filter(matches)
    this.folders.doneP = this.folders.done.filter(matches)
  }

  /** Collapses or expands a sidebar category group. */
  toggleCategory(category: MailCategory): void {
    this.collapsed[category] = !this.collapsed[category]
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(this.collapsed))
    } catch {
      // storage unavailable (private browsing, ...): keep the state in memory
    }
  }

  /**
   * Loads the mails of a folder. With `push`, the next page (15 mails older
   * than the last loaded one) is appended for infinite scrolling.
   */
  async getMails(type?: string, folder?: string, push = false): Promise<void> {
    if (isMailCategory(type)) {
      this.currentType = type
    }
    if (folder) {
      this.currentFolder = folder
    }

    let from = 0
    if (push && this.currentFolderMails.length > 0) {
      from = this.currentFolderMails[this.currentFolderMails.length - 1].date
    }

    try {
      const { data, error } = await mailsControllerListMessagesByFolder({
        path: { category: this.currentType, folder: this.currentFolder },
        query: { nb: '15', direction: 'past', from: String(from) },
      })
      if (error) {
        handleApiError(error)
        return
      }
      runInAction(() => {
        const mails = asArray(data) as Array<Mail>
        if (push) {
          this.currentFolderMails.push(...mails)
        } else {
          this.currentFolderMails = mails
        }
      })
    } catch (err) {
      // no connection - TODO: show a notification
      console.error('Failed to load mails:', err)
    }
  }
}

const store = new Store()

export default store
