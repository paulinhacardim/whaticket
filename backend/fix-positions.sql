-- Script SQL para corrigir posições na tabela Distributions
-- Execute este SQL no seu banco de dados

-- VERSÃO COM VARIÁVEL - Para a fila 2:
SET @position = -1;
UPDATE whaticket.Distributions 
SET position = (@position := @position + 1)
WHERE queueId = 2
ORDER BY id;

-- ALTERNATIVA MANUAL - Para a fila 2:
-- Primeiro, vamos ver os registros atuais
SELECT id, queueId, userId, position FROM whaticket.Distributions WHERE queueId = 2 ORDER BY id;

-- Se a versão com variável não funcionar, use esta (substitua os IDs pelos valores reais da query acima):
/*
UPDATE whaticket.Distributions SET position = 0 WHERE id = 2;
UPDATE whaticket.Distributions SET position = 1 WHERE id = 3;
UPDATE whaticket.Distributions SET position = 2 WHERE id = 4;
UPDATE whaticket.Distributions SET position = 3 WHERE id = 6;
UPDATE whaticket.Distributions SET position = 4 WHERE id = 7;
UPDATE whaticket.Distributions SET position = 5 WHERE id = 11;
UPDATE whaticket.Distributions SET position = 6 WHERE id = 12;
*/

-- Verificar se as posições foram corrigidas:
SELECT queueId, userId, position, isCurrentUser 
FROM whaticket.Distributions 
WHERE queueId = 2 
ORDER BY position;

-- Resultado esperado:
-- queueId | userId | position | isCurrentUser
-- 2       | 1      | 0        | 1 (ou 0)
-- 2       | 1      | 1        | 0 (ou 1)  
-- 2       | 1      | 2        | 0
-- 2       | 1      | 3        | 0
-- etc...

-- Para corrigir TODAS as filas (se necessário):
/*
UPDATE whaticket.Distributions 
SET position = (
  SELECT ROW_NUMBER() OVER (PARTITION BY queueId ORDER BY id) - 1
  FROM (
    SELECT id, queueId FROM whaticket.Distributions d2
  ) AS numbered
  WHERE numbered.id = whaticket.Distributions.id
);
*/