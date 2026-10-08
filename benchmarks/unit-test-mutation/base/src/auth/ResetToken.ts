export interface ResetToken {
  token: string;
  userId: string;
  issuedAt: Date;
  usedAt: Date | null;
}
