┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   KRX APIs      │    │   BOK APIs      │    │   Scheduler     │
│   (Stock Data)  │    │ (Economic Data) │    │  (Automated)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Collectors                              │
│  • KRXCollector: KOSPI, Trading, Options                       │
│  • BOKCollector: Rates, FX, Economic Indicators                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                Fear & Greed Calculator                          │
│  • 5-Component Weighted Algorithm                               │
│  • 0-100 Scale with Confidence Score                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database Storage                             │
│  • Historical Fear & Greed Index                               │
│  • Market Data Archive                                         │
│  • Economic Indicators                                         │
└─────────────────────────────────────────────────────────────────┘