import { Types } from 'mongoose'

// ─── Enums / unions ───────────────────────────────────────────────────────────

export type Status = 'ok' | 'moyen' | 'ko'

export type Unit =
  | 'farfadets'
  | 'louveteaux-jeannettes'
  | 'scouts-guides'
  | 'pionniers-caravelles'
  | 'compagnons'

export type Role = 'admin' | 'equipier' | 'chef'

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  _id: Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: Role
  unit?: Unit
  createdAt: Date
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface ComponentDef {
  key: string
  label: string
  hasEyelets?: boolean
  isQuantified?: boolean
}

export interface Category {
  _id: Types.ObjectId
  name: string
  componentTemplate: ComponentDef[]
  createdAt: Date
}

// ─── Item / Component ─────────────────────────────────────────────────────────

export interface Photo {
  url: string
  publicId: string
  uploadedBy: Types.ObjectId
  uploadedAt: Date
  caption?: string
}

export interface Component {
  key: string
  label: string
  status: Status
  quantity?: number
  quantityExpected?: number
  notes: string
  photos?: Photo[]
}

export interface Item {
  _id: Types.ObjectId
  categoryId: Types.ObjectId
  name: string
  type?: string
  globalStatus: Status
  priority: number
  components: Component[]
  notes: string
  updatedAt: Date
  updatedBy: Types.ObjectId
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export interface Reservation {
  _id: Types.ObjectId
  itemId: Types.ObjectId
  itemName: string
  reservedBy: Types.ObjectId
  unit?: Unit
  eventName: string
  startDate: Date
  endDate: Date
  createdAt: Date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export interface DateRange {
  start: Date
  end: Date
}

export interface ItemFilters {
  categoryId?: string
  globalStatus?: Status
  page?: number
}

export interface ReservationFilters {
  itemId?: string
  userId?: string
  start?: Date
  end?: Date
}

export interface CreateItemInput {
  categoryId: string
  name: string
  type?: string
  globalStatus: Status
  notes?: string
  updatedBy: string
}

export interface ItemStatusUpdate {
  globalStatus: Status
  notes?: string
  updatedBy: string
}

export interface ComponentStatusUpdate {
  status?: Status
  quantity?: number
  quantityExpected?: number
  notes?: string
}

export interface CreateReservationInput {
  itemId: string
  itemName: string
  reservedBy: string
  unit?: Unit
  eventName: string
  startDate: Date
  endDate: Date
}

export interface Credentials {
  email: string
  password: string
}

export type Action =
  | 'manage_users'
  | 'manage_equipment'
  | 'update_equipment_status'
  | 'upload_photo'
  | 'create_reservation'
  | 'cancel_any_reservation'
