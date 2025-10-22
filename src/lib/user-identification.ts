import { getCurrentUser } from 'aws-amplify/auth'

export interface UserIdentification {
  cognitoUserId: string
  email: string
  appUserId?: string // RevenueCat app user ID
  stripeCustomerId?: string
}

export class UserIdentificationService {
  private static instance: UserIdentificationService

  static getInstance(): UserIdentificationService {
    if (!UserIdentificationService.instance) {
      UserIdentificationService.instance = new UserIdentificationService()
    }
    return UserIdentificationService.instance
  }

  async getCurrentUserIdentification(): Promise<UserIdentification | null> {
    try {
      const cognitoUser = await getCurrentUser()
      
      return {
        cognitoUserId: cognitoUser.userId,
        email: cognitoUser.signInDetails?.loginId || '',
        // These would be fetched from your database or Cognito custom attributes
        appUserId: await this.getAppUserId(cognitoUser.userId),
        stripeCustomerId: await this.getStripeCustomerId(cognitoUser.userId)
      }
    } catch (error) {
      console.error('Error getting user identification:', error)
      return null
    }
  }

  async setAppUserId(cognitoUserId: string, appUserId: string): Promise<void> {
    try {
      // Store the mapping between Cognito user ID and RevenueCat app user ID
      // This could be stored in:
      // 1. Cognito custom attributes
      // 2. A separate database table
      // 3. DynamoDB
      
      // Example implementation for Cognito custom attributes:
      // await updateUserAttributes({
      //   userAttributes: {
      //     'custom:app_user_id': appUserId
      //   }
      // })

      console.log('App User ID mapping stored:', { cognitoUserId, appUserId })
    } catch (error) {
      console.error('Error setting app user ID:', error)
      throw error
    }
  }

  async setStripeCustomerId(cognitoUserId: string, stripeCustomerId: string): Promise<void> {
    try {
      // Store the mapping between Cognito user ID and Stripe customer ID
      // Similar to setAppUserId, this could be stored in various ways
      
      console.log('Stripe Customer ID mapping stored:', { cognitoUserId, stripeCustomerId })
    } catch (error) {
      console.error('Error setting Stripe customer ID:', error)
      throw error
    }
  }

  private async getAppUserId(cognitoUserId: string): Promise<string | undefined> {
    try {
      // Retrieve the app user ID from your storage
      // This is a placeholder - implement based on your storage solution
      return undefined
    } catch (error) {
      console.error('Error getting app user ID:', error)
      return undefined
    }
  }

  private async getStripeCustomerId(cognitoUserId: string): Promise<string | undefined> {
    try {
      // Retrieve the Stripe customer ID from your storage
      // This is a placeholder - implement based on your storage solution
      return undefined
    } catch (error) {
      console.error('Error getting Stripe customer ID:', error)
      return undefined
    }
  }

  // Method to generate a consistent app user ID for RevenueCat
  generateAppUserId(cognitoUserId: string, email: string): string {
    // Use a consistent format that can be reconstructed
    // This ensures the same user gets the same app_user_id across devices
    return `cognito_${cognitoUserId}_${email.split('@')[0]}`
  }
}

// Export singleton instance
export const userIdentificationService = UserIdentificationService.getInstance()
