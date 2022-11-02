from json import dumps


import socket

 

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 1145))
data = {
    "user":"3051561876",
    "text":"Ok, I will be the first"
}
data = dumps(data)
sock.send(data.encode('utf-8'))
print(sock.recv(65536).decode('utf-8'))
sock.close()
print("end of connect")