ALTER TABLE service_package_plans
  MODIFY COLUMN offer_type ENUM('BATH_FIVE', 'BATH_THREE_FULL_GROOM', 'POINT_CARD') NULL AFTER description;

CREATE TEMPORARY TABLE service_package_legacy_card_sources AS
SELECT plan.shop_id,
       plan.species,
       COALESCE(
         MAX(CASE WHEN service.breed_price_category = 'BATH' AND service.package_point_cost = 1
                  THEN service.price * 4 END),
         MAX(plan.price)
       ) AS card_price,
       MIN(CASE WHEN service.breed_price_category = 'BATH' AND service.package_point_cost = 1
                THEN service.id END) AS bath_service_id
FROM service_package_plans plan
LEFT JOIN service_package_plan_services plan_service
  ON plan_service.shop_id = plan.shop_id AND plan_service.plan_id = plan.id
LEFT JOIN services service
  ON service.shop_id = plan_service.shop_id AND service.id = plan_service.service_id
WHERE plan.offer_type IN ('BATH_FIVE', 'BATH_THREE_FULL_GROOM')
GROUP BY plan.shop_id, plan.species;

INSERT INTO service_package_plans
  (shop_id, name, description, offer_type, term, usage_count, price, species)
SELECT source.shop_id,
       CONCAT('美容包月卡（', CASE source.species
         WHEN 'DOG' THEN '狗'
         WHEN 'CAT' THEN '貓'
         ELSE '狗與貓'
       END, '）'),
       NULL,
       'POINT_CARD',
       'MONTH',
       5,
       source.card_price,
       source.species
FROM service_package_legacy_card_sources source
WHERE source.card_price > 0
  AND NOT EXISTS (
    SELECT 1
    FROM service_package_plans point_plan
    WHERE point_plan.shop_id = source.shop_id
      AND point_plan.species = source.species
      AND point_plan.offer_type = 'POINT_CARD'
  );

INSERT IGNORE INTO service_package_plan_services
  (shop_id, plan_id, service_id, included_uses)
SELECT point_plan.shop_id, point_plan.id, source.bath_service_id, 1
FROM service_package_legacy_card_sources source
INNER JOIN service_package_plans point_plan
  ON point_plan.shop_id = source.shop_id
 AND point_plan.species = source.species
 AND point_plan.offer_type = 'POINT_CARD'
WHERE source.bath_service_id IS NOT NULL;

UPDATE service_package_plans
SET status = 'INACTIVE'
WHERE offer_type IN ('BATH_FIVE', 'BATH_THREE_FULL_GROOM');

DROP TEMPORARY TABLE service_package_legacy_card_sources;
