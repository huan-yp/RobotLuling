"""使用 Python-socketserver 搭建的微服务
使用 TCP 协议发送数据, 建议使用 socket 提供的接口
发送数据和接受数据的格式如下 (JSON 字符串), 使用 utf-8 编码:
Response:
{
    "user":"3051501876"
    "text":"I'm Luling"
}
Request-JSON:
{
    "user":"3051561876",
    "text":"Hello"
}
如果 response 的 text 为空, 则表示该请求失败.
"""
import socket
import os
import time
import socketserver
import logging

from logging import INFO, ERROR
from threading import Thread, Lock
from json import loads, dumps, load

SERVER_DEBUG = True
JAVASCRIPT_FILENAME = "characterInteractive.js"
CHARACTER_NAME = "鹿灵"
CONFIG_PATH = "./Config.json"
EMPTY_MESSAGE = ""
HOST, PORT = ("127.0.0.1", 1145)
HELP_INFO = "鹿灵 AI 使用指北:\n \
    1.通过在聊天中 @ 鹿灵让 AI 处理你的对话, AI 会将含有 @ 自己的对话的全部内容作为输入数据处理.\n \
    2.受到服务器容量限制, 如果同时 @ AI 的对话过多, 会只处理第一条对话, 处理过程中的其它对话会被忽略.\n \
    3.AI 上线时间受我 (幻影彭) 的计算机联网时间限制.\n \
    4.请不要引导 AI 谈论政治话题.\n \
    5.AI 所说的一切均为根据上下文和网络信息虚构, 在一些关键问题上, 不要相信它."




class GlobalAttr():
    statu = 'waiting'
    lock = Lock()


LOG_FORMAT = "%(asctime)s - %(levelname)s - %(message)s"
G = GlobalAttr()
BOT_ID = "1558718963"
logger = logging.Logger("PythonServerLogger")
std_handler = logging.StreamHandler()
std_handler.setFormatter(logging.Formatter(LOG_FORMAT))
file_handler = logging.FileHandler("PythonServerLog.txt")
file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
logger.addHandler(file_handler)
logger.addHandler(std_handler)


class Chat():
    text = ""
    user = "" # 需要 @ 的 User
    is_response = True
    def __init__(self, message, user:str, is_response=0):
        self.text = message
        self.user = user
        self.is_response = is_response

    def create(self):
        """返回 JSON 字符串, 表示聊天信息
        """
        return dumps({
            "user":self.user,
            "text":self.text
        })
    
    def __str__(self):
        return str(self.__dict__)
    
    
class MyServer(socketserver.BaseRequestHandler):
    def handle(self):
        conn = self.request         # request里封装了所有请求的数据
        data = conn.recv(65536).decode('utf-8')
        if not data:
            conn.close()
            return 
        logger.log(INFO, "origin:" + str(data))
        request_dict = loads(data)
        request_chat = Chat(request_dict['text'], request_dict['user'])
        logger.log(INFO, "request:" + str(request_chat))
        response = get_response(request_chat)
        logger.log(INFO, "Response:" + str(response))
        conn.sendall(dumps({"text":response.text, "user":response.user}).encode('utf-8'))
        conn.close()
            

def read_from_json(jsonPath:str) -> dict:
    """从 js 返回的东西中读取并返回回应字典.
    顺便处理被重复加码的字符串, 即: \\\" -> \"
    """
    with open(jsonPath, mode='r', encoding='utf-8') as f:
        result_dict = load(f)
        ori = result_dict['response']
        start = ori.find('{')
        endstr = "\\\"is_final_chunk\\\": true}"
        end = ori.find(endstr) + len(endstr)
        ori = ori[start:end]
        ori = ori.replace("\\\\", "\\")
        ori = ori.replace("\\\"", "\"")
        ori = loads(ori)
        result_dict['response'] = ori
    return result_dict['response']


def send_request(text:str) -> str:
    """向 JS 服务发送请求
    Args:
        text : 请求文本 (含 mirai 码)
    Returns:
        str: 机器人的回答
    """
    text = text.replace(f"@{BOT_ID}", "@鹿灵")
    reply_text = ""
    if ("/help" in text):
        reply_text = HELP_INFO
    elif not SERVER_DEBUG:
        f = os.popen(f"node {JAVASCRIPT_FILENAME} \"{text}\" \"{CHARACTER_NAME}\" {CONFIG_PATH}")
        result_file = f.readline().strip()
        f.close()
        response_dict = read_from_json(result_file)
        replies = response_dict['replies']
        reply_text = replies[0]['text']
    else:
        time.sleep(10)
        reply_text = "Test Message"
    reply_text.replace("\n", "\n\r")
    return reply_text


def get_response(request:Chat) -> Chat:
    """通过 ChatRequest 获取 Response
    """
    try:
        G.lock.acquire()
        if (G.statu == 'waiting'):
            G.statu = 'processing'
            G.lock.release() 
            reply_text = send_request(request.text)
            G.lock.acquire()
            G.statu = 'waiting'
            G.lock.release()
            return Chat(reply_text, request.user, 1)
        else: 
            G.lock.release()
            return Chat(EMPTY_MESSAGE, request.user, 1)
    except (BaseException, Exception) as e:
        logger.log(ERROR, str(e))


def main():
    server = socketserver.ThreadingTCPServer(('127.0.0.1', 1145), MyServer)
    logger.log(INFO, "Server Start")
    server.serve_forever()
    
    
main()