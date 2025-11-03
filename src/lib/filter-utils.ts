import { Lottery, Bet, User, Role } from "./types"

export function filterLotteries(
  lotteries: Lottery[],
  searchTerm: string,
  filters: {
    isActive?: boolean
    playsTomorrow?: boolean
  }
): Lottery[] {
  let filtered = lotteries

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filtered = filtered.filter(
      (lottery) =>
        lottery.name.toLowerCase().includes(term) ||
        lottery.openingTime.includes(term) ||
        lottery.closingTime.includes(term) ||
        lottery.drawTime.includes(term)
    )
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter((lottery) => lottery.isActive === filters.isActive)
  }

  if (filters.playsTomorrow !== undefined) {
    filtered = filtered.filter((lottery) => lottery.playsTomorrow === filters.playsTomorrow)
  }

  return filtered
}

export function filterBets(
  bets: Bet[],
  searchTerm: string,
  filters: {
    lotteryId?: string
    dateFrom?: string
    dateTo?: string
    isWinner?: boolean
  }
): Bet[] {
  let filtered = bets

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filtered = filtered.filter(
      (bet) =>
        bet.lotteryName.toLowerCase().includes(term) ||
        bet.animalName.toLowerCase().includes(term) ||
        bet.animalNumber.includes(term)
    )
  }

  if (filters.lotteryId) {
    filtered = filtered.filter((bet) => bet.lotteryId === filters.lotteryId)
  }

  if (filters.dateFrom) {
    filtered = filtered.filter((bet) => bet.timestamp >= filters.dateFrom!)
  }

  if (filters.dateTo) {
    filtered = filtered.filter((bet) => bet.timestamp <= filters.dateTo!)
  }

  if (filters.isWinner !== undefined) {
    filtered = filtered.filter((bet) => bet.isWinner === filters.isWinner)
  }

  return filtered
}

export function filterUsers(
  users: User[],
  searchTerm: string,
  filters: {
    isActive?: boolean
    roleId?: string
  }
): User[] {
  let filtered = users

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filtered = filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
    )
  }

  if (filters.isActive !== undefined) {
    filtered = filtered.filter((user) => user.isActive === filters.isActive)
  }

  if (filters.roleId) {
    filtered = filtered.filter((user) => user.roleIds.includes(filters.roleId!))
  }

  return filtered
}

export function filterRoles(
  roles: Role[],
  searchTerm: string
): Role[] {
  if (!searchTerm) return roles

  const term = searchTerm.toLowerCase()
  return roles.filter(
    (role) =>
      role.name.toLowerCase().includes(term) ||
      role.description.toLowerCase().includes(term) ||
      role.permissions.some((perm) => perm.toLowerCase().includes(term))
  )
}
