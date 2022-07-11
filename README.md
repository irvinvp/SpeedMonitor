# Speed Monitor
![flujo](https://github.com/irvinvp/SpeedMonitor/actions/workflows/main.yml/badge.svg)

## Comandos UDP
Los comando deben de enviarse a UDP puerto 8081 a la IP 192.168.4.1 

![image](https://user-images.githubusercontent.com/10320683/178340747-c1d09ced-df1a-4651-99c4-961c5e01ac1d.png)
#### Comando para cambiar el nombre y password de la red
```
lan nombre_de_lan password_lan
```
Ejemplo
```
lan Alfa 0123456789
```
La respuesta esperada si fue configurado correctamete es
```
lanok Alfa 0123456789
```
#### Comando para cambiar servidor de destino, tiene que tener abierto el puerto 5555/udp
![image](https://user-images.githubusercontent.com/10320683/178341503-4ea1d802-e8d8-47b4-a41f-b118e79599da.png)
```
serv nombre_del_servidor
```
Ejemplo
```
serv monitor.nixi.pw
```
La respuesta esperada si fue configurado correctamente es
```
servok monitor.nixi.pw
```
#### Respuesta esperada del servidor
El servidor debe de responder un paquete UDP fijo con la palabra **"pong\r\n"**, al mismo puerto y dirección de origen.

```
server.send("pong\r\n", rinfo.port, rinfo.address);
```
### Datos de equipo demo
```
Serial: 4cebd67d04a8
Red: SpeedMonitor-04a8
Password: STOvWfQSo
```
### Servidor de escucha
```
https://monitor.nixi.pw/api#/
```
