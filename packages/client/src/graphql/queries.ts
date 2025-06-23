import { gql } from '@apollo/client';

export const GET_ROYALTY_RATES = gql\`
  query GetRoyaltyRates {
    royaltyRates {
      platform
      format
      rate
    }
  }
\`;

export const CALCULATE_ROYALTIES = gql\`
  mutation CalculateRoyalties($input: RoyaltyInput!) {
    calculateRoyalties(input: $input) {
      totalEarnings
      breakdown {
        platform
        format
        sales
        earnings
      }
    }
  }
\`;

export const GET_USER_PROFILE = gql\`
  query GetUserProfile {
    user {
      id
      email
      name
      subscriptionTier
    }
  }
\`;
