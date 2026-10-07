# Examples

## 1. Input validation at the edge (INP-1, INP-2, CFG-7)

```typescript
import { z } from 'zod';
import { Request, Response } from 'express';

const UserSchema = z
  .object({
    email: z.string().email().max(254),
    age: z.number().min(18),
  })
  .strict();

type ValidatedUser = z.infer<typeof UserSchema>;

const createSanitizedProfile = (user: ValidatedUser): Readonly<ValidatedUser> => ({
  ...user,
  email: user.email.toLowerCase().trim(),
});

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const result = UserSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: 'Invalid input parameters' });
    return;
  }

  await userRepository.insert(createSanitizedProfile(result.data));

  res.status(201).json({ message: 'User registered' });
};
```

`userRepository.insert` must use parameterized statements or an ORM builder (INP-2).

## 2. Security headers and rate limiting (AC-9, RES-2)

```typescript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import express, { Application } from 'express';

const createSecureApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  app.use('/api/', apiLimiter);

  return app;
};
```

Helmet sets CSP, HSTS, and `X-Frame-Options` and removes `X-Powered-By`. In production behind a proxy, configure `trust proxy` for known hops only (AC-10) and use a shared store for the limiter.

## 3. Tenant-scoped read (AC-1, AC-2, DATA-1)

```typescript
export const getInvoice = async (req: AuthedRequest, res: Response): Promise<void> => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: req.principal.tenantId },
  });

  if (!invoice) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(toInvoiceDto(invoice));
};
```

## 4. Fix pattern: IDOR

- Invariant: a caller reads only invoices of its own tenant.
- Narrowest change: add `tenantId: principal.tenantId` to the query `where`, and return 404 when no row matches.
- Regression test: tenant B requesting tenant A's invoice ID receives 404 and no data.
