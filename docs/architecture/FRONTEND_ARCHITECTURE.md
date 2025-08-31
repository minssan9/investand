# Frontend Architecture Guide

## 📁 **New Folder Structure**

```
/frontend/src/
├── components/             # Vue Component Library
│   ├── common/            # Shared/reusable components
│   │   ├── BaseButton.vue    # Button variations
│   │   ├── BaseCard.vue      # Card container
│   │   ├── LoadingSpinner.vue # Loading states
│   │   └── ErrorDisplay.vue   # Error handling
│   ├── charts/            # Chart components
│   │   ├── FearGreedChart.vue    # Main F&G index chart
│   │   ├── HistoryChart.vue      # Historical data chart
│   │   └── ComparisonChart.vue   # Comparison visualizations
│   └── forms/             # Form components
│       ├── LoginForm.vue     # Authentication forms
│       ├── SettingsForm.vue  # Configuration forms
│       └── FilterForm.vue    # Data filtering
├── composables/            # Vue Composition Functions
│   ├── api/               # API-related composables
│   │   ├── useFearGreed.ts   # F&G data management
│   │   ├── useMarketData.ts  # Market data handling
│   │   └── useApiError.ts    # Error handling
│   ├── auth/              # Authentication composables
│   │   ├── useAuth.ts        # User authentication (existing)
│   │   ├── usePermissions.ts # Permission checks
│   │   └── useSession.ts     # Session management
│   └── ui/                # UI-related composables
│       ├── useTheme.ts       # Theme switching
│       ├── useNotifications.ts # Toast notifications
│       └── useModal.ts       # Modal management
├── stores/                 # Pinia State Management
│   ├── auth.ts            # Authentication state
│   ├── fearGreed.ts       # F&G index state
│   ├── marketData.ts      # Market data state
│   └── app.ts             # Global app state
├── services/               # API Services
│   ├── api.ts             # Main API service (existing)
│   ├── adminApi.ts        # Admin API service (existing)  
│   └── utils/             # Service utilities
│       ├── httpClient.ts     # HTTP client configuration
│       ├── errorHandler.ts   # API error handling
│       └── requestCache.ts   # Request caching
├── utils/                  # Utility Functions
│   ├── common/            # Common utilities
│   │   ├── logger.ts         # Client-side logging (moved)
│   │   ├── date.ts           # Date formatting
│   │   ├── validation.ts     # Form validation
│   │   └── constants.ts      # App constants
│   └── charts/            # Chart utilities
│       ├── chartConfig.ts    # Chart.js configuration
│       ├── dataTransform.ts  # Data transformation
│       └── colorSchemes.ts   # Color palettes
├── types/                  # TypeScript Definitions
│   ├── api.ts             # API request/response types
│   ├── fearGreed.ts       # F&G index types
│   ├── marketData.ts      # Market data types
│   ├── admin.ts           # Admin interface types
│   └── common.ts          # Common/shared types
├── tests/                  # Test Suite
│   ├── components/        # Component tests
│   │   ├── common/           # Common component tests
│   │   ├── charts/           # Chart component tests
│   │   └── forms/            # Form component tests
│   ├── composables/       # Composable tests
│   │   ├── api/             # API composable tests
│   │   ├── auth/            # Auth composable tests
│   │   └── ui/              # UI composable tests
│   ├── stores/            # Store tests
│   │   └── *.test.ts        # Pinia store tests
│   └── utils/             # Utility tests
│       ├── common/          # Common utility tests
│       └── charts/          # Chart utility tests
├── layouts/                # Layout Components (existing)
├── pages/                  # Page Components (existing)
├── router/                 # Vue Router (existing)
├── css/                    # Styling (existing)
├── boot/                   # Quasar boot files (existing)
├── App.vue                 # Root component
└── main.ts                 # Application entry point
```

## 🎯 **Design Principles**

### **1. Component-Driven Development**
- **Atomic Design**: Common → Specific → Pages
- **Single Responsibility**: One purpose per component
- **Reusability**: Shared components across features
- **Composition**: Build complex UIs from simple parts

### **2. State Management Strategy**
- **Pinia Stores**: Feature-based store organization
- **Composables**: Reusable stateful logic
- **Local State**: Component-specific state only
- **Reactive Data**: Vue 3 reactivity system

### **3. Scalable Architecture**
- **Feature Folders**: Group related functionality
- **Type Safety**: Comprehensive TypeScript coverage
- **Test Coverage**: Mirror source structure in tests
- **Separation**: Logic (composables) vs. Presentation (components)

## 🔧 **Key Improvements**

### **Before → After**

| Aspect | Before | After | Benefit |
|--------|--------|--------|---------|
| Components | No organization | 3-tier structure (common/charts/forms) | 🧩 Better reusability |
| State | No centralized store | Pinia stores by domain | 📊 Organized state |
| Composables | 1 auth composable | Domain-organized composables | 🔄 Logic reuse |
| Utils | Logger at root level | Organized by purpose | 🛠️ Better utility management |
| Types | No type definitions | Comprehensive typing | 📝 Type safety |
| Tests | No test structure | Full test coverage structure | 🧪 Testing strategy |

## 🚀 **Usage Examples**

### **Component Usage**
```vue
<template>
  <BaseCard>
    <FearGreedChart :data="chartData" />
    <BaseButton @click="refreshData">
      Refresh
    </BaseButton>
  </BaseCard>
</template>

<script setup lang="ts">
import BaseCard from '@/components/common/BaseCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import FearGreedChart from '@/components/charts/FearGreedChart.vue'
</script>
```

### **Composable Usage**
```typescript
// In a Vue component
import { useFearGreed } from '@/composables/api/useFearGreed'
import { useAuth } from '@/composables/auth/useAuth'
import { useNotifications } from '@/composables/ui/useNotifications'

export default defineComponent({
  setup() {
    const { currentIndex, fetchIndex, isLoading } = useFearGreed()
    const { isAuthenticated } = useAuth()
    const { showSuccess, showError } = useNotifications()
    
    return {
      currentIndex,
      fetchIndex,
      isLoading,
      isAuthenticated,
      showSuccess,
      showError
    }
  }
})
```

### **Store Usage**
```typescript
// stores/fearGreed.ts
import { defineStore } from 'pinia'

export const useFearGreedStore = defineStore('fearGreed', () => {
  const currentIndex = ref<number>(50)
  const history = ref<FearGreedRecord[]>([])
  const isLoading = ref(false)
  
  const fetchCurrentIndex = async () => {
    isLoading.value = true
    try {
      const response = await api.getCurrentIndex()
      currentIndex.value = response.value
    } catch (error) {
      console.error('Failed to fetch index:', error)
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    currentIndex,
    history,
    isLoading,
    fetchCurrentIndex
  }
})
```

### **Type Usage**
```typescript
// types/fearGreed.ts
export interface FearGreedIndex {
  date: string
  value: number
  level: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  confidence: number
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

// types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}
```

## 🔍 **Migration Guide**

### **File Movements**
1. `src/logger.ts` → `src/utils/common/logger.ts`
2. `src/composables/useAuth.ts` → `src/composables/auth/useAuth.ts`
3. Create new component files in organized structure
4. Add Pinia stores for state management

### **New Dependencies**
```json
{
  "pinia": "^2.1.0",
  "@pinia/testing": "^0.1.0"
}
```

### **Import Path Updates**
```typescript
// Old
import { useAuth } from '@/composables/useAuth'
import logger from '@/logger'

// New  
import { useAuth } from '@/composables/auth/useAuth'
import { logger } from '@/utils/common/logger'
```

## 🧪 **Testing Strategy**

### **Component Testing**
```typescript
// tests/components/common/BaseButton.test.ts
import { mount } from '@vue/test-utils'
import BaseButton from '@/components/common/BaseButton.vue'

describe('BaseButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(BaseButton, {
      props: { variant: 'primary' }
    })
    expect(wrapper.classes()).toContain('btn-primary')
  })
})
```

### **Composable Testing**
```typescript
// tests/composables/api/useFearGreed.test.ts  
import { useFearGreed } from '@/composables/api/useFearGreed'

describe('useFearGreed', () => {
  it('fetches index data', async () => {
    const { currentIndex, fetchIndex } = useFearGreed()
    await fetchIndex()
    expect(currentIndex.value).toBeGreaterThan(0)
  })
})
```

## 📊 **Performance Benefits**

- **Code Splitting**: Component-based lazy loading
- **Tree Shaking**: Better bundling with clear imports
- **Caching**: Composable-based request caching
- **Reactivity**: Optimized Vue 3 reactivity
- **Type Checking**: Compile-time error detection

## 🏗️ **Future Extensibility**

- **New Features**: Add composables + stores + components
- **Themes**: Extend theme composables and utilities
- **Internationalization**: Add i18n composables
- **PWA Features**: Add service worker composables
- **Mobile**: Add mobile-specific components

## 🎨 **UI/UX Patterns**

### **Design System**
- Common components provide consistent UI
- Chart components use standardized color schemes
- Form components follow validation patterns
- Loading states managed through composables

### **Accessibility**
- ARIA labels in common components
- Keyboard navigation support
- Screen reader compatibility
- Focus management in modals