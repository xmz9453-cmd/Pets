ALTER TABLE services
  DROP INDEX uq_services_name;

ALTER TABLE services
  ADD UNIQUE KEY uq_services_name_species (name, species);
