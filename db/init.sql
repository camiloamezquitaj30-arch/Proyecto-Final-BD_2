CREATE DATABASE  IF NOT EXISTS `erp` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `erp`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: erp
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `detalle_pedido`
--

DROP TABLE IF EXISTS `detalle_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_pedido` (
  `id_detalle_pedido` int NOT NULL AUTO_INCREMENT,
  `id_pedido` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precioUnitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `precioUnitario`)) STORED,
  `porcentaje_iva` decimal(5,2) NOT NULL DEFAULT '0.19',
  `total_producto` decimal(12,2) GENERATED ALWAYS AS (((`cantidad` * `precioUnitario`) * (1 + `porcentaje_iva`))) VIRTUAL,
  PRIMARY KEY (`id_detalle_pedido`),
  KEY `fk_detalle_pedido__pedidos` (`id_pedido`) /*!80000 INVISIBLE */,
  KEY `detalle_pedido_productos` (`id_producto`),
  CONSTRAINT `detalle_pedido_productos` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_pedido__pedidos` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_pedido`
--

LOCK TABLES `detalle_pedido` WRITE;
/*!40000 ALTER TABLE `detalle_pedido` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_pedido` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalle_pedido_BEFORE_INSERT` BEFORE INSERT ON `detalle_pedido` FOR EACH ROW BEGIN
    declare estado_producto int;
    declare mensaje_cant_equivocada varchar(255);
    declare mensaje_inactivo varchar(255);
	
    select estado into estado_producto from productos 
    where id_producto = new.id_producto;
    
    IF estado_producto = 0 then
		set mensaje_inactivo = 'El producto se encuentra inactivo';
        signal sqlstate '45000'
				set message_text = mensaje_inactivo;
	end if;
            
    IF NEW.cantidad <= 0 THEN
		set mensaje_cant_equivocada = 'Cantidad menor a cero, por favor ingrese un valor positivo.';
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = mensaje_cant_equivocada;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalle_pedido_AFTER_INSERT` AFTER INSERT ON `detalle_pedido` FOR EACH ROW BEGIN
	-- Actualiza el pedido en productos
    update productos set cantidad_stock = cantidad_stock + new.cantidad, precioCompra = new.precioUnitario
    where id_producto = new.id_producto;
	
    
    -- actualiza el total en pedidos 
    UPDATE pedidos 
		SET total_pedido = total_pedido + ((new.cantidad * new.precioUnitario)*(1 + new.porcentaje_iva))
    WHERE id_pedido = NEW.id_pedido;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalle_pedido_BEFORE_UPDATE` BEFORE UPDATE ON `detalle_pedido` FOR EACH ROW BEGIN
	declare stock_disponible int;
    declare mensaje_error varchar(255);
	 DECLARE estado_actual VARCHAR(20);
    
    SELECT estado_pedido INTO estado_actual FROM pedidos WHERE id_pedido = NEW.id_pedido;
    
    -- aqui se restringe que el pedido no sea modificado 
    IF estado_actual IN ('Anulado', 'Pagado', 'Enviado') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: No se puede modificar un pedido que ya ha sido Anulado, Pagado o Enviado.';
    END IF;
    
    select cantidad_stock into stock_disponible from productos 
    WHERE id_producto = new.id_producto;
    
    IF (NEW.cantidad - OLD.cantidad) > stock_disponible or new.cantidad <= 0
	then 
		set mensaje_error = CONCAT('Error: Existencias insuficientes. Stock disponible: ', stock_disponible , ' o valor registrado es cero 0');
			signal sqlstate '45000' 
				set message_text = mensaje_error;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalle_pedido_AFTER_UPDATE` AFTER UPDATE ON `detalle_pedido` FOR EACH ROW BEGIN
	    
    -- actualizando el total del pedido
    update pedidos 
		SET total_pedido = total_pedido 
        - (old.cantidad * old.precioUnitario * (1 + old.porcentaje_iva))
        + (NEW.cantidad * NEW.precioUnitario * (1 + NEW.porcentaje_iva))
    where id_pedido = new.id_pedido;
	
    -- actualizando la cantidad de productos
    
    update productos
		set cantidad_stock = (cantidad_stock - old.cantidad) + new.cantidad , precioCompra = (precioCompra - old.precioUnitario ) + new.precioUnitario
    where id_producto = new.id_producto; 
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalle_pedido_AFTER_DELETE` AFTER DELETE ON `detalle_pedido` FOR EACH ROW BEGIN
	    -- disparador para que el valor del pedido quede en cero 
    UPDATE pedidos
		SET total_pedido = total_pedido - ((OLD.cantidad * OLD.precioUnitario)*(1 + old.porcentaje_iva))
	WHERE id_pedido = OLD.id_pedido;
    
	-- disparador para devolver productos a la tabla productos 
	update productos 
		SET cantidad_stock = cantidad_stock - old.cantidad
    where id_producto = old.id_producto;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `detalleventa`
--

DROP TABLE IF EXISTS `detalleventa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalleventa` (
  `id_detalle_venta` int NOT NULL AUTO_INCREMENT,
  `id_venta` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precioUnitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `precioUnitario`)) STORED,
  `porcentaje_iva` decimal(5,2) DEFAULT '0.19',
  `total_venta` decimal(12,2) GENERATED ALWAYS AS (((`cantidad` * `precioUnitario`) * (1 + `porcentaje_iva`))) STORED,
  PRIMARY KEY (`id_detalle_venta`),
  KEY `id_venta` (`id_venta`),
  KEY `id_producto` (`id_producto`),
  CONSTRAINT `detalleventa_ibfk_1` FOREIGN KEY (`id_venta`) REFERENCES `ventas` (`id_venta`) ON UPDATE CASCADE,
  CONSTRAINT `detalleventa_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalleventa`
--

LOCK TABLES `detalleventa` WRITE;
/*!40000 ALTER TABLE `detalleventa` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalleventa` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalleventa_BEFORE_INSERT` BEFORE INSERT ON `detalleventa` FOR EACH ROW BEGIN
	declare total_ingresado int;
    declare stock_actual int;
    declare estado_producto int;
    declare mensaje_cant_equivocada varchar(255);
    declare mensaje_inactivo varchar(255);
    
	
    SELECT SUM(cantidad) INTO total_ingresado 
    FROM detalle_pedido 
    WHERE id_producto = NEW.id_producto;
    
    select estado into estado_producto from productos 
    where id_producto = new.id_producto;
    
    SELECT cantidad_stock INTO stock_actual 
    FROM productos 
    WHERE id_producto = NEW.id_producto;
    
    IF estado_producto = 0 then
		set mensaje_inactivo = 'El producto se encuentra inactivo';
        signal sqlstate '45000'
				set message_text = mensaje_inactivo;
	end if;
    
    IF total_ingresado is null or total_ingresado <= 0 or NEW.cantidad <= 0 or NEW.cantidad > stock_actual THEN
		set mensaje_cant_equivocada = 'Cantidad menor a cero, por favor ingrese un valor positivo.';
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = mensaje_cant_equivocada;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalleventa_AFTER_INSERT` AFTER INSERT ON `detalleventa` FOR EACH ROW BEGIN
	-- Actualiza la tabla productos
    update productos set cantidad_stock = cantidad_stock - new.cantidad
    where id_producto = new.id_producto;
	
    
    -- actualiza el total en ventas 
    UPDATE ventas 
		SET total_venta = total_venta + ((new.cantidad * new.precioUnitario)*(1 + new.porcentaje_iva))
    WHERE id_venta = NEW.id_venta;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalleventa_BEFORE_UPDATE` BEFORE UPDATE ON `detalleventa` FOR EACH ROW BEGIN
	declare estado_actual VARCHAR(20);
    declare stock_disponible int;
    declare mensaje_error varchar(255);
    declare mensaje_error_costo varchar(255);
	declare costo int;
    
    SELECT estado_venta INTO estado_actual FROM ventas WHERE id_venta = NEW.id_venta;
	select precioCompra into costo from productos where id_producto = new.id_producto;
    
	IF  new.precioUnitario < costo then
		set mensaje_error_costo = 'El valor del producto no puede ser menor al costo';
        signal sqlstate '45000'
				set message_text =mensaje_error_costo;
	end if;
    
    -- aqui se restringe que la venta no sea modificada 
    IF estado_actual IN ('Anulado', 'Pagado', 'Enviado') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: No se puede modificar una  venta que ya ha sido Anulada, Pagada o Enviada.';
    END IF;
    
    select cantidad_stock into stock_disponible from productos 
    WHERE id_producto = new.id_producto;
    
    IF (NEW.cantidad - OLD.cantidad) > stock_disponible or new.cantidad <= 0
	then 
		set mensaje_error = CONCAT('Error: Existencias insuficientes. Stock disponible: ', stock_disponible , ' o valor registrado es cero 0');
			signal sqlstate '45000' 
				set message_text = mensaje_error;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalleventa_AFTER_UPDATE` AFTER UPDATE ON `detalleventa` FOR EACH ROW BEGIN
    -- actualizando el total de la venta
    update ventas 
		SET total_venta = total_venta 
        - (old.cantidad * old.precioUnitario * (1 + old.porcentaje_iva))
        + (NEW.cantidad * NEW.precioUnitario * (1 + NEW.porcentaje_iva))
    where id_venta = new.id_venta;
	
    -- actualizando la cantidad de productos
    
    update productos
		set cantidad_stock = (cantidad_stock + old.cantidad) - new.cantidad 
    where id_producto = new.id_producto; 
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `detalleventa_AFTER_DELETE` AFTER DELETE ON `detalleventa` FOR EACH ROW BEGIN
	-- disparador para que el valor del pedido quede en cero 
    UPDATE ventas
		SET total_venta = total_venta - ((OLD.cantidad * OLD.precioUnitario)*(1 + old.porcentaje_iva))
	WHERE id_venta = OLD.id_venta;
    
	-- disparador para devolver productos a la tabla productos 
	update productos 
		SET cantidad_stock = cantidad_stock + old.cantidad
    where id_producto = old.id_producto;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `fecha_pedido` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_pedido` decimal(12,2) DEFAULT '0.00',
  `estado_pedido` enum('Pendiente','Pagado','Anulado','Enviado','Por Pagar') DEFAULT 'Pendiente',
  `usuarios_id_usuario` int NOT NULL,
  `tercero_id_tercero` int NOT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `fk_pedidos_usuarios1_idx` (`usuarios_id_usuario`),
  KEY `fk_pedidos_tercero1_idx` (`tercero_id_tercero`),
  CONSTRAINT `fk_pedidos_tercero1` FOREIGN KEY (`tercero_id_tercero`) REFERENCES `terceros` (`id_tercero`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pedidos_usuarios1` FOREIGN KEY (`usuarios_id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `pedidos_BEFORE_UPDATE` BEFORE UPDATE ON `pedidos` FOR EACH ROW BEGIN
	 IF OLD.estado_pedido = 'Anulado' THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'Error: Un pedido anulado no puede volver a cambiarse de estado por seguridad contable.';
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `pedidos_AFTER_UPDATE` AFTER UPDATE ON `pedidos` FOR EACH ROW BEGIN
    -- trigger que al anular un pedido retorna los productos a la tabla productos
    IF NEW.estado_pedido = 'Anulado' AND OLD.estado_pedido <> 'Anulado' THEN
        UPDATE productos p
			INNER JOIN detalle_pedido dp ON p.id_producto = dp.id_producto
				SET p.cantidad_stock = p.cantidad_stock + dp.cantidad
        WHERE dp.id_pedido = NEW.id_pedido;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `cantidad_stock` int NOT NULL DEFAULT '0',
  `nivel_minimo` int NOT NULL DEFAULT '5',
  `precioCompra` decimal(12,2) NOT NULL DEFAULT '0.00',
  `precioVenta` decimal(12,2) NOT NULL DEFAULT '0.00',
  `estado` tinyint(1) NOT NULL DEFAULT '1',
  `tarifa_iva` decimal(5,2) NOT NULL DEFAULT '0.19',
  PRIMARY KEY (`id_producto`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `productos_BEFORE_UPDATE` BEFORE UPDATE ON `productos` FOR EACH ROW BEGIN
-- Verificamos si el usuario está intentando cambiar el estado a 0 (Inactivo)
    IF NEW.estado = 0 AND OLD.estado = 1 THEN
        -- REGLA 1: No permitir si hay stock disponible
        IF OLD.cantidad_stock > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Operación denegada: El producto no se puede inactivar porque aún tiene stock.';
        END IF;
        -- REGLA 2: No permitir si el producto está en el detalle de algún pedido

        IF EXISTS (SELECT 1 FROM detalle_pedido WHERE id_producto = OLD.id_producto) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Operación denegada: El producto está amarrado a un pedido existente.';
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `tercero_tipo_cliente`
--

DROP TABLE IF EXISTS `tercero_tipo_cliente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tercero_tipo_cliente` (
  `id_tercero` int NOT NULL,
  `id_tercero_tipo_cliente` int NOT NULL,
  `tipo_cliente_id` int NOT NULL,
  PRIMARY KEY (`id_tercero_tipo_cliente`,`tipo_cliente_id`),
  KEY `fk_tercero_tipo_idx` (`id_tercero`),
  KEY `fk_tercero_tipo_cliente_tipo_cliente1_idx` (`tipo_cliente_id`),
  CONSTRAINT `fk_tercero` FOREIGN KEY (`id_tercero`) REFERENCES `terceros` (`id_tercero`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tipo_cliente` FOREIGN KEY (`tipo_cliente_id`) REFERENCES `mydb`.`tipo_cliente` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tercero_tipo_cliente`
--

LOCK TABLES `tercero_tipo_cliente` WRITE;
/*!40000 ALTER TABLE `tercero_tipo_cliente` DISABLE KEYS */;
/*!40000 ALTER TABLE `tercero_tipo_cliente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `terceros`
--

DROP TABLE IF EXISTS `terceros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terceros` (
  `id_tercero` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `contacto` varchar(30) NOT NULL,
  `estado` tinyint DEFAULT '1',
  PRIMARY KEY (`id_tercero`),
  UNIQUE KEY `contacto_UNIQUE` (`contacto`),
  UNIQUE KEY `correo_UNIQUE` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terceros`
--

LOCK TABLES `terceros` WRITE;
/*!40000 ALTER TABLE `terceros` DISABLE KEYS */;
/*!40000 ALTER TABLE `terceros` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `terceros_BEFORE_UPDATE` BEFORE UPDATE ON `terceros` FOR EACH ROW BEGIN
	DECLARE cantidad_ventas INT DEFAULT 0;
    -- Contamos si existen ventas asociadas a este cliente
    SELECT COUNT(*) INTO cantidad_ventas 
    FROM ventas 
    WHERE tercero_id = OLD.id_tercero;

    -- Si hay 1 o más ventas, disparamos el error y bloqueamos
    IF cantidad_ventas > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Acción denegada: No se puede eliminar el cliente porque tiene ventas registradas en el sistema.';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `estado` int DEFAULT '1',
  `roles_id_rol` int NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas` (
  `id_venta` int NOT NULL AUTO_INCREMENT,
  `fecha_venta` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_venta` decimal(12,2) DEFAULT '0.00',
  `estado_venta` enum('Pendiente','Pagado','Anulado','Enviado','Por Pagar') DEFAULT 'Pendiente',
  `usuarios_id_usuario` int NOT NULL,
  `tercero_id_tercero` int NOT NULL,
  PRIMARY KEY (`id_venta`),
  KEY `fk_ventas_usuarios1_idx` (`usuarios_id_usuario`),
  KEY `fk_ventas_tercero1_idx` (`tercero_id_tercero`),
  CONSTRAINT `fk_ventas_tercero1` FOREIGN KEY (`tercero_id_tercero`) REFERENCES `terceros` (`id_tercero`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ventas_usuarios1` FOREIGN KEY (`usuarios_id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'erp'
--

--
-- Dumping routines for database 'erp'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-16 22:33:16
