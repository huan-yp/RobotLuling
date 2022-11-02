package org.example.mirai.plugin

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonObject
import net.mamoe.mirai.Bot
import net.mamoe.mirai.console.plugin.jvm.JvmPluginDescription
import net.mamoe.mirai.console.plugin.jvm.KotlinPlugin
import net.mamoe.mirai.event.GlobalEventChannel
import net.mamoe.mirai.event.events.BotInvitedJoinGroupRequestEvent
import net.mamoe.mirai.event.events.FriendMessageEvent
import net.mamoe.mirai.event.events.GroupMessageEvent
import net.mamoe.mirai.event.events.NewFriendRequestEvent
import net.mamoe.mirai.message.data.At
import net.mamoe.mirai.message.data.Image
import net.mamoe.mirai.message.data.Image.Key.queryUrl
import net.mamoe.mirai.message.data.PlainText
import net.mamoe.mirai.message.data.buildMessageChain
import net.mamoe.mirai.utils.info
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.*
/**
 * 使用 kotlin 版请把
 * `src/main/resources/META-INF.services/net.mamoe.mirai.console.plugin.jvm.JvmPlugin`
 * 文件内容改成 `org.example.mirai.plugin.PluginMain` 也就是当前主类全类名
 *
 * 使用 kotlin 可以把 java 源集删除不会对项目有影响
 *
 * 在 `settings.gradle.kts` 里改构建的插件名称、依赖库和插件版本
 *
 * 在该示例下的 [JvmPluginDescription] 修改插件名称，id和版本，etc
 *
 * 可以使用 `src/test/kotlin/RunMirai.kt` 在 ide 里直接调试，
 * 不用复制到 mirai-console-loader 或其他启动器中调试
 */
const val PORT = 1145
const val HOST = "127.0.0.1"

object PluginMain : KotlinPlugin(
    JvmPluginDescription(
        id = "org.example.mirai-example",
        name = "鹿灵AI",
        version = "0.1.0"
    ) {
        author("幻影彭(3051561876@qq.com)")
        info(
            """
            使用自制接口连接 beta.character.ai, 实现的一个对话机器人 
        """.trimIndent()
        )
        // author 和 info 可以删除.
    }
) {
    override fun onEnable() {
        logger.info { "Plugin loaded" }
        //配置文件目录 "${dataFolder.absolutePath}/"
        val bot = Bot.getInstance(1558718963)
        val channel = bot.eventChannel
//        val eventChannel = GlobalEventChannel.parentScope(this)
        channel.subscribeAlways<GroupMessageEvent> {
            //群消息
            //复读示例
            val message_text = message.contentToString()
            var response :Map<String, JsonElement>
            if (message_text.contains(bot.id.toString())) {

                Socket(HOST, PORT).use{ socket ->
                    val buffIn = BufferedReader(InputStreamReader(socket.getInputStream(), Charsets.UTF_8))
                    val buffOut = BufferedWriter(OutputStreamWriter(socket.getOutputStream(), Charsets.UTF_8))
                    val map_obj = mapOf("user" to sender.id.toString(), "text" to message_text)
                    buffOut.write(Json.encodeToString(map_obj))
                    buffOut.flush()
                    response = Json.parseToJsonElement(buffIn.readText()).jsonObject.toMap()
                }
                var response_text = response["text"].toString()
                response_text = response_text.substring(1, response_text.length - 1)
                if(response_text.isNotEmpty()) {
                    response_text = response_text.replace("\\n", "\n")
                    val chain = buildMessageChain {
                        +PlainText(response_text)
                        +At(sender.id)
                    }
                    group.sendMessage(chain)
                }
            }

//            if (message.contentToString().startsWith("复读")) {
//                group.sendMessage(message.contentToString().replace("复读", ""))
//            }
//            if (message.contentToString() == "hi") {
//                //群内发送
//                group.sendMessage("hi")
//                //向发送者私聊发送消息
//                sender.sendMessage("Hello")
//                //不继续处理
//                return@subscribeAlways
//            }
            //分类示例
//            message.forEach {
//                //循环每个元素在消息里
//                if (it is Image) {
//                    //如果消息这一部分是图片
//                    val url = it.queryUrl()
//                    group.sendMessage("图片，下载地址$url")
//                }
//                if (it is PlainText) {
//                    //如果消息这一部分是纯文本
//                    group.sendMessage("纯文本，内容:${it.content}")
//                }
//            }
        }
        channel.subscribeAlways<FriendMessageEvent> { event ->
            //好友信息

            sender.sendMessage("I'm Luling")
        }
        channel.subscribeAlways<NewFriendRequestEvent> {
            //自动同意好友申请
        }
        channel.subscribeAlways<BotInvitedJoinGroupRequestEvent> {
            //自动同意加群申请
        }
    }
}
