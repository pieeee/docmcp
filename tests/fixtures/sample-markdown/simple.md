# Getting Started

Welcome to the documentation.

## Installation

Install the package using npm:

```bash
npm install example
```

## Usage

Import and use the library:

```javascript
import { example } from 'example';

example.doSomething();
```

## API Reference

### Functions

#### doSomething()

Does something useful.

```typescript
function doSomething(): void
```

#### configure(options)

Configures the library.

```typescript
interface Options {
  debug: boolean;
  timeout: number;
}

function configure(options: Options): void
```
