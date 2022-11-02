/*
使用 ES6 JavaScript 标准


JavaScrpit 请求发送程序:
向 beta.character.ai 发送一条对话消息, 并获取回复


通过命令行参数描述信息
> node characterInteractive.js [chat text] [character's name] [config path]
chat text:向角色发送的文本
character's name:角色名字
config path: Config.json 文件路径

通过 Config.json 描述每个角色:
{
    "[character's name]":{ 
        "character_external_id": "sWmJWP54MljfcCu2yAhqI3azaCwYUIVBmfX3wZX6fB0", 
        "history_external_id": "6dU1WNHBrZMmmiIQV90gCeOV0KTJk3LaTc0pNFlI", 
        "tgt": "internal_id:10732:83983e05-a4be-4267-bcd5-a74b2131de70"
    },
    "[characrter's name2]":{
        ...
    },
    "authorization": "Token xxxxxxxxxxxx示例Tokenxxxxxxxxxxx"
}
characterConfig.json 是一个字典, 字典结构如上:
    [character's name]: 角色名字, 通过该参数匹配接下来的三个参数, 命令行调用时的 name 就是该参数.
        character_exertnal_id: POST 报文内容, 可以浏览器 F12 获取
        histroy_external_id: POST 报文内容, 可以浏览器 F12 获取
        tgt: POST 报文内容, 可以浏览器 F12 获取
    authorization: POST 标头内容, 可以浏览器 F12 获取
注意, [character's name] 下的三个元素对于不同角色是不同的, 需要分别获取, 每次开启新对话后均会重置.


程序返回会直接向命令行打印一个文件路径, 该文件存储了 json 格式的信息:
{
    "status":[状态码],
    "headers":[响应标头信息],
    "error":[错误信息],
    "response":[角色对话信息],
    "arguments:"[命令行参数信息]
}
角色对话信息只打印第一个回话, 也就是机器人接下来参考的上下文
*/


import http from 'http';
import url from 'url'
import fs from 'fs'
import path from 'path';

var result = {}
const __dirname = path.resolve()

function httpsPostRequest(URL, postData, header){  
    // var postData = JSON.stringify(_postDataJson);
    // console.log(Buffer.byteLength(postData))
    var options = {
        host: 'localhost',
        port: 7890, // 使用 clahs-for-windows 代理软件, 默认使用 localhost 7890 端口.
        path: URL,
        timeout: 30000,
        method: 'POST',
        headers: header,
    };
    // console.log(postData);
    // console.log(options);
    return new Promise((resolve, reject) => {
        var req = http.request(options, res => {
            if(res.statusCode < 200 || res.statusCode >= 300) reject(URL + '\nbad status ' + res.statusCode);
            else {
                var body = '';
                result['status'] = res.statusCode;
                result['headers'] = res.headers;
                // console.log(`status: ${res.statusCode}`);
                // console.log(`headers: ${JSON.stringify(res.headers)}`);
                
                res.on('data', chunk => {
                    body += chunk;
                });
                res.on('end', () => {
                    // console.log(body);
                    if(body) resolve(body);
                    else reject(URL + '\nNULL page');
                });
            }
        });
        req.write(postData)
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(), reject(URL + '\ntimeout'); });
        req.end();
    });
    
}

function makeSpeechRequest(text, name, configPath){
    try{
        var config = JSON.parse(fs.readFileSync(configPath, {encoding:"utf-8"}));
        // console.log(config);
        // console.log(config['characters']);
        var char_url = 'https://beta.character.ai/chat/streaming/';
        var characterConfig = config['characters'][name];
        var token = config["authorization"];
        var postData = {
            "history_external_id": characterConfig["history_external_id"],
            "character_external_id": characterConfig["character_external_id"],
            "text": text,
            "tgt": characterConfig["tgt"],
            "ranking_method": "random",
            "faux_chat": false,
            "staging": false,
            "model_server_address": null,
            "override_prefix": null,
            "override_rank": null,
            "rank_candidates": null,
            "filter_candidates": null,
            "prefix_limit": null,
            "prefix_token_limit": null,
            "livetune_coeff": null,
            "stream_params": null,
            "enable_tti": null,
            "initial_timeout": null,
            "insert_beginning": null,
            "translate_candidates": null,
            "stream_every_n_steps": 16,
            "chunks_to_pad": 8,
            "is_proactive": false
        }
        postData = JSON.stringify(postData);
        var header = {
            Host: url.parse(char_url).host,
            'accept': '*/*',
            'authorization': token,
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
            'content-type': 'application/json',
            'content-Length': Buffer.byteLength(postData),
            'accept-encoding': 'gzip, deflate, br',
        }
    }
    catch(error){
        result["error"] = error + ", please check your config.json";
        // console.log("error:", error, "please check your config.json");
        return ;
    }
    return httpsPostRequest(char_url, postData, header).then(response => {
        response = JSON.stringify(response);
        var len = response.length;
        var start = Math.max(len - 5e3, 0);
        response = response.substr(start, len);
        result['response'] = response;
    });
}
function main(){
    var args = process.argv;
    result['arguments'] = args.toString()
    if(args.length != 5){
        result['error'] = "too few cli arguments";
        // console.log("error:too few cli arguments")
        return ;
    }
    var text = args[2], name = args[3], configPath = args[4];
    result['arguments'] = {
        "call": args[1],
        "text": text,
        "name": name,
        "configPath": configPath
    }
    makeSpeechRequest(text, name, configPath).catch(error => {
        result['error'] = error;
        // console.log("error:", error);
        // console.log("error:", JSON.stringify(error));
        // console.log(result);
    }).finally(function(){
        var filePath = path.join(__dirname, "result.json");
        fs.writeFileSync("result.json", JSON.stringify(result));
        console.log(filePath);
    });
}
main();