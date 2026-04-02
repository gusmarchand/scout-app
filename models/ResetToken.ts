import { Schema, model, models } from 'mongoose'

const ResetTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
})

export const ResetToken = models.ResetToken ?? model('ResetToken', ResetTokenSchema)
