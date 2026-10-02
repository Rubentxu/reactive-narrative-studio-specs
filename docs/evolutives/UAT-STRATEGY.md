# UAT Strategy

## Confidence stack

```text
Human Acceptance
Black-box UAT
Cross-runtime tests
Integration / Component
Contract / Unit / Static
```

No se busca maximizar E2E sino asignar a cada claim el oracle correcto.

### M10.1 canonical example
Incorrecto: construir manualmente un manifest esperado y llamarlo roundtrip.
Correcto: ejecutar Python real + UI/TS real + comparar outputs semánticos.

Browser evidence: trace retain-on-failure, screenshot, console/page errors y video cuando aporte valor.

Human UAT se registra como evidence tipada, no se sustituye con un score automático.
