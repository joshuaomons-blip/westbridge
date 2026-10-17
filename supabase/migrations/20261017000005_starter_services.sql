-- =====================================================================
-- Starter service listings. Created UNPUBLISHED on purpose: review each
-- description in the dashboard (Services) and publish only the services
-- Norvane Express actually offers.
-- =====================================================================
insert into public.services (slug, icon, sort_order, is_published, title, description) values
('international-parcel', 'globe', 10, false,
 '{"en":"International Parcel Shipping","pl":"Międzynarodowa wysyłka paczek","ja":"国際小包配送","es":"Envío internacional de paquetes","de":"Internationaler Paketversand"}',
 '{"en":"Send parcels across borders with a tracking reference for every shipment.","pl":"Wysyłaj paczki za granicę z numerem śledzenia dla każdej przesyłki.","ja":"すべての貨物に追跡番号を付けて、国境を越えて小包をお届けします。","es":"Envíe paquetes al extranjero con un número de seguimiento para cada envío.","de":"Versenden Sie Pakete ins Ausland – mit einer Sendungsnummer für jede Lieferung."}'),
('domestic-delivery', 'truck', 20, false,
 '{"en":"Domestic Delivery","pl":"Dostawa krajowa","ja":"国内配送","es":"Entrega nacional","de":"Inlandszustellung"}',
 '{"en":"Pickup and delivery of parcels and documents within the country.","pl":"Odbiór i dostawa paczek oraz dokumentów na terenie kraju.","ja":"国内での小包や書類の集荷と配達。","es":"Recogida y entrega de paquetes y documentos dentro del país.","de":"Abholung und Zustellung von Paketen und Dokumenten im Inland."}'),
('freight', 'container', 30, false,
 '{"en":"Freight Transportation","pl":"Transport towarowy","ja":"貨物輸送","es":"Transporte de carga","de":"Frachttransport"}',
 '{"en":"Transport for larger consignments, pallets and bulk goods.","pl":"Transport większych przesyłek, palet i towarów masowych.","ja":"大型貨物、パレット、大量の商品の輸送。","es":"Transporte de envíos de mayor tamaño, palés y mercancías a granel.","de":"Transport größerer Sendungen, Paletten und Massengüter."}'),
('business-shipping', 'briefcase', 40, false,
 '{"en":"Business Shipping","pl":"Wysyłka dla firm","ja":"法人向け配送","es":"Envíos para empresas","de":"Geschäftsversand"}',
 '{"en":"Regular shipping arrangements for companies and online sellers.","pl":"Regularne usługi wysyłkowe dla firm i sprzedawców internetowych.","ja":"企業やオンライン販売者向けの定期配送サービス。","es":"Servicios de envío regulares para empresas y vendedores en línea.","de":"Regelmäßige Versandlösungen für Unternehmen und Online-Händler."}'),
('shipment-tracking', 'map-pin', 50, false,
 '{"en":"Shipment Tracking","pl":"Śledzenie przesyłek","ja":"貨物追跡","es":"Seguimiento de envíos","de":"Sendungsverfolgung"}',
 '{"en":"Follow the recorded progress of your shipment online with your tracking number.","pl":"Śledź zarejestrowany postęp przesyłki online za pomocą numeru śledzenia.","ja":"追跡番号を使って、貨物の記録された進捗状況をオンラインで確認できます。","es":"Siga en línea el progreso registrado de su envío con su número de seguimiento.","de":"Verfolgen Sie den erfassten Fortschritt Ihrer Sendung online mit Ihrer Sendungsnummer."}'),
('logistics-support', 'headset', 60, false,
 '{"en":"Logistics Support","pl":"Wsparcie logistyczne","ja":"物流サポート","es":"Soporte logístico","de":"Logistik-Support"}',
 '{"en":"Help with planning shipments, documentation and delivery questions.","pl":"Pomoc w planowaniu przesyłek, dokumentacji i pytaniach o dostawę.","ja":"配送計画、書類、配達に関するご相談をサポートします。","es":"Ayuda con la planificación de envíos, documentación y preguntas sobre entregas.","de":"Unterstützung bei Versandplanung, Dokumenten und Fragen zur Zustellung."}');
