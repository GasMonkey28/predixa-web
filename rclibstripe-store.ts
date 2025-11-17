warning: in the working copy of 'src/lib/subscription-service.ts', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/lib/stripe-store.ts b/src/lib/stripe-store.ts[m
[1mindex 898a873..e795e4b 100644[m
[1m--- a/src/lib/stripe-store.ts[m
[1m+++ b/src/lib/stripe-store.ts[m
[36m@@ -165,7 +165,7 @@[m [mexport const useStripeStore = create<StripeState & StripeActions>((set, get) =>[m
       [m
       const subscription = await response.json()[m
       // If subscription is null, that's fine - just means no active subscription[m
[31m-      set({ subscription, isLoading: false })[m
[32m+[m[32m      set({ subscription, isLoading: false, error: null })[m
     } catch (error: any) {[m
       set({ error: error.message || 'Failed to fetch subscription', isLoading: false })[m
     }[m
[1mdiff --git a/src/lib/subscription-service.ts b/src/lib/subscription-service.ts[m
[1mindex bfa0d00..741b548 100644[m
[1m--- a/src/lib/subscription-service.ts[m
[1m+++ b/src/lib/subscription-service.ts[m
[36m@@ -51,26 +51,30 @@[m [mexport class SubscriptionService {[m
       const entitlements = await this.getEntitlements()[m
       [m
       if (entitlements) {[m
[31m-        if (entitlements.access_granted) {[m
[31m-          const derivedStatus =[m
[31m-            entitlements.status === 'active'[m
[31m-              ? 'active'[m
[31m-              : ('trialing' as const)[m
[32m+[m[32m        const status = entitlements.status[m
[32m+[m[32m        const isTrialing =[m
[32m+[m[32m          status === 'trialing' && entitlements.trial_active[m
[32m+[m[32m        const isActive = status === 'active'[m
[32m+[m[32m        const hasAccess =[m
[32m+[m[32m          entitlements.access_granted || isActive || isTrialing[m
[32m+[m
[32m+[m[32m        if (hasAccess) {[m
[32m+[m[32m          const derivedStatus = isActive ? 'active' : ('trialing' as const)[m
           const effectivePeriodEnd =[m
             entitlements.current_period_end ??[m
             entitlements.trial_expires_at ??[m
             0[m
[31m-          const planName =[m
[31m-            entitlements.status === 'trialing' && entitlements.trial_active[m
[31m-              ? 'Free Trial'[m
[31m-              : this.getPlanName(entitlements.plan)[m
[32m+[m[32m          const planName = isTrialing[m
[32m+[m[32m            ? 'Free Trial'[m
[32m+[m[32m            : this.getPlanName(entitlements.plan)[m
[32m+[m
           return {[m
[31m-            id: entitlements.plan || 'trial',[m
[32m+[m[32m            id: entitlements.plan || (isTrialing ? 'trial' : 'plan'),[m
             status: derivedStatus,[m
             platform: 'stripe',[m
             current_period_end: effectivePeriodEnd,[m
             plan: {[m
[31m-              id: entitlements.plan || 'trial',[m
[32m+[m[32m              id: entitlements.plan || (isTrialing ? 'trial' : 'plan'),[m
               name: planName,[m
               amount: 0,[m
               interval: 'month',[m
[36m@@ -166,7 +170,22 @@[m [mexport class SubscriptionService {[m
 [m
   private async getStripeSubscription(): Promise<UnifiedSubscription | null> {[m
     try {[m
[31m-      const response = await fetch('/api/stripe/subscription')[m
[32m+[m[32m      let url = '/api/stripe/subscription'[m
[32m+[m
[32m+[m[32m      try {[m
[32m+[m[32m        const user = await getCurrentUser()[m
[32m+[m[32m        if (user?.userId) {[m
[32m+[m[32m          const params = new URLSearchParams({ userId: user.userId })[m
[32m+[m[32m          url = `${url}?${params.toString()}`[m
[32m+[m[32m        }[m
[32m+[m[32m      } catch (error) {[m
[32m+[m[32m        console.warn('Stripe subscription: unable to get current user', error)[m
[32m+[m[32m      }[m
[32m+[m
[32m+[m[32m      const response = await fetch(url, {[m
[32m+[m[32m        credentials: 'include',[m
[32m+[m[32m        cache: 'no-store',[m
[32m+[m[32m      })[m
       if (!response.ok) return null[m
 [m
       const subscription = await response.json()[m
[36m@@ -210,7 +229,12 @@[m [mexport class SubscriptionService {[m
   async hasActiveSubscription(): Promise<boolean> {[m
     const entitlements = await this.getEntitlements()[m
     if (entitlements) {[m
[31m-      if (entitlements.access_granted) {[m
[32m+[m[32m      const status = entitlements.status[m
[32m+[m[32m      const isTrialing =[m
[32m+[m[32m        status === 'trialing' && entitlements.trial_active[m
[32m+[m[32m      const isActive = status === 'active'[m
[32m+[m
[32m+[m[32m      if (entitlements.access_granted || isTrialing || isActive) {[m
         return true[m
       }[m
     }[m
