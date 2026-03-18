import type { VeloxDbRepository } from '@/data/repositories/VeloxDbRepository'
import { TauriVeloxDbRepository } from '@/data/repositories/TauriVeloxDbRepository'

export const veloxDbRepository: VeloxDbRepository =
  new TauriVeloxDbRepository()

