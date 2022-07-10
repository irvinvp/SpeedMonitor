
import time
import network
import machine
import binascii
import socket
import math
import json
version = "0.1"
print("Run main V"+version)
print("Serial: "+str(binascii.hexlify(machine.unique_id(),"-"),'utf-8'))
wdt = machine.WDT(timeout=20000)
pw = "S"+str(binascii.b2a_base64(machine.unique_id()),'utf-8').split("\n")[0]
print("PW: "+pw)
p0 = machine.Pin(22, machine.Pin.OUT); p0.value(0)

# AP
ap = network.WLAN(network.AP_IF)
ap.config(essid='SpeedMonitor-'+str(binascii.hexlify(machine.unique_id(),""),'utf-8')[11:17],password=pw,authmode=3,channel=9)
ap.config(max_clients=3); ap.active(True) 
print("AP: "+'SpeedMonitor-'+str(binascii.hexlify(machine.unique_id(),""),'utf-8')[11:17])

# Servidor UDP
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setblocking(False)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0",8081))

#  Conectar a modem
nic = network.WLAN(network.STA_IF)
try:
  nic.disconnect()
except:
  pass
nic.active(True)
try:
  lan = json.loads(open("lan.json", "r").read())
  print("lan "+lan[0]+" "+lan[1])
except:
  lan = ['SpeedMonitor',"speed"]
  f = open("lan.json", "w")
  f.write(json.dumps(lan))
  f.close()
  print("new lan "+json.dumps(lan))
if(not nic.isconnected()):  nic.connect(lan[0],lan[1])  

# Remote server
try:
  c_server = json.loads(open("server.json", "r").read())
  print("server ip "+str(c_server))
except:
  c_server = ["server.sub.omnitracs.online"]
  f = open("server.json", "w")
  f.write(json.dumps(c_server))
  f.close()
  print("new server "+str(c_server[0]))

int1s = 0
pin_st = 0
def run1s(timer):
  global int1s
  int1s = int1s+1
  
 # Comados UDP
def udp(data, address):
  global c_server, last_ping,ping_real
  print("udp> "+str(data))
  if(len(str(data,'utf-8').split(" "))==3 and str(data,'utf-8').split(" ")[0]=="lan"):
    x = str(data,'utf-8').split(" ")

    try:
      nic.disconnect()
    except:
      pass
    if(not nic.isconnected()):  nic.connect(x[1],x[2].split("\r")[0])  
    print(json.dumps([x[1],x[2].split("\r")[0]]))
    f = open("lan.json", "w")
    f.write(json.dumps([x[1],x[2].split("\r")[0]]))
    f.close()
    s.sendto("lanok "+str(x[1])+" "+str(x[2].split("\r")[0]), address)
  elif(len(str(data,'utf-8').split(" "))==2 and str(data,'utf-8').split(" ")[0]=="serv"):
      c_server = [str(data,'utf-8').split(" ")[1].split("\r")[0]]

      print(str(c_server))
      f = open("server.json", "w")

      f.write(json.dumps(c_server))
      f.close()
      s.sendto("servok "+str(c_server[0]), address)
  elif(data==b'pong\r\n' or data==b'pong\n'):
      last_ping = time.ticks_diff(time.ticks_ms(),ping_real)
      print("ping_delay "+str(last_ping))
      p0.value(True)
      led_d = 0
  else:
    s.sendto(data, address)
  
timer0 = machine.Timer(0)
timer0.init(period=10, mode=machine.Timer.PERIODIC, callback=run1s)

time_ping = 0
ping_real = time.ticks_ms()
last_ping = 0
led_d = 0
while True:
  if int1s >=1:
    led_d = led_d + 1
    if(not nic.isconnected()):
      if(led_d>50 and not ap.isconnected()):
        led_d = 0
        p0.value(pin_st)
        pin_st = not pin_st
      elif(led_d>15 and  ap.isconnected()):
        led_d = 0
        p0.value(pin_st)
        pin_st = not pin_st
    else:
        if(led_d>50):
          led_d = 0
          p0.value(False)
     
    # UDP service
    try:
      data, address = s.recvfrom(4096)
      udp(data, address)
    except:
      pass
      
    time_ping = time_ping +1
    if(time_ping>500):
      time_ping = 0
      try:
        s.sendto("ping-"+str(binascii.hexlify(machine.unique_id(),""),'utf-8')+"*"+str(last_ping), socket.getaddrinfo(c_server[0], 5555)[0][-1])
        ping_real = time.ticks_ms()
      except:
        pass
    
    # Control
    state = machine.disable_irq()
    int1s = 0
    machine.enable_irq(state)
    wdt.feed()

