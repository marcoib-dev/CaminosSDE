import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    estado: 'ok',
    fecha: new Date().toISOString(),
  });
});

export default router;
