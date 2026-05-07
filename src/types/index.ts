export type Priority = 'high' | 'medium' | 'low'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'once'
export type Status = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  frequency: Frequency
  estimate?: string
  tools?: string[]
  deliverable?: string
}

export interface SubCategory {
  id: string
  title: string
  tasks: Task[]
}

export interface Category {
  id: string
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  subCategories: SubCategory[]
}

export type TaskStateMap = Record<string, Status>
