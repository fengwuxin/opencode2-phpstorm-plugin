package paviko.opencode.settings

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.ConfigurationException
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import java.awt.Color
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * Settings UI component for OpenCode plugin configuration.
 * Provides a settings panel under Tools > OpenCode Plug with configurable options.
 */
class OpenCodeConfigurable : Configurable {

    private var mainPanel: JPanel? = null
    private var customCommandField: JBTextField? = null
    private var executablePathField: JBTextField? = null
    private var commandErrorLabel: JBLabel? = null

    private val settings = OpenCodeSettings.getInstance()
    private val logger = Logger.getInstance(OpenCodeConfigurable::class.java)

    override fun getDisplayName(): String = "OpenCode 插件"

    override fun createComponent(): JComponent? {
        try {
            // Create UI components
            customCommandField = JBTextField(settings.state.customCommand)
            executablePathField = JBTextField(settings.state.executablePath)

            // Create error label for validation messages
            commandErrorLabel = JBLabel().apply {
                foreground = Color.RED
                isVisible = false
            }

            // Add validation listeners
            setupValidationListeners()

            // Build the form
            mainPanel = FormBuilder.createFormBuilder()
                .addLabeledComponent(JBLabel("opencode 可执行文件："), executablePathField!!, 1, false)
                .addComponentToRightColumn(JBLabel("留空自动探测（homebrew、nvm、bun、PATH）。"))
                .addLabeledComponent(JBLabel("额外的 serve 参数："), customCommandField!!, 1, false)
                .addComponentToRightColumn(JBLabel("追加到 “opencode serve” 的额外参数。"))
                .addComponent(commandErrorLabel!!)
                .addComponentFillVertically(JPanel(), 0)
                .panel

            return mainPanel
        } catch (e: Exception) {
            logger.error("Failed to create settings UI component", e)
            return JPanel().apply {
                add(JBLabel("创建设置面板失败，请查看日志。"))
            }
        }
    }

    private fun setupValidationListeners() {
        // Command validation (basic check for empty/whitespace)
        customCommandField?.document?.addDocumentListener(object : javax.swing.event.DocumentListener {
            override fun insertUpdate(e: javax.swing.event.DocumentEvent?) {
                validateCommand()
            }

            override fun removeUpdate(e: javax.swing.event.DocumentEvent?) {
                validateCommand()
            }

            override fun changedUpdate(e: javax.swing.event.DocumentEvent?) {
                validateCommand()
            }
        })
    }

    

    private fun validateCommand(): Boolean {
        val command = customCommandField?.text?.trim() ?: ""
        // Command can be empty (uses default), but warn about suspicious patterns
        if (command.isNotEmpty() && (command.contains("&&") || command.contains("||") || command.contains(";"))) {
            commandErrorLabel?.text = "警告：命令包含 shell 操作符，可能无法按预期工作"
            commandErrorLabel?.isVisible = true
            return true // Still valid, just a warning
        } else {
            commandErrorLabel?.isVisible = false
            return true
        }
    }

    override fun isModified(): Boolean {
        val currentState = settings.state

        return customCommandField?.text != currentState.customCommand ||
            executablePathField?.text != currentState.executablePath
    }

    override fun apply() {
        try {
            // Validate all fields before applying
            if (!validateCommand()) {
                throw ConfigurationException("命令配置无效。")
            }

            val state = settings.state

            // Apply custom command
            customCommandField?.text?.let { command ->
                val newCommand = command.trim()
                state.customCommand = newCommand
                logger.info("Applied custom command: '$newCommand'")
            }

            // Apply executable path
            executablePathField?.text?.let { path ->
                val newPath = path.trim()
                state.executablePath = newPath
                logger.info("Applied executable path: '$newPath'")
            }

            logger.info("Settings applied successfully")
        } catch (e: ConfigurationException) {
            logger.error("Configuration validation failed", e)
            throw e
        } catch (e: Exception) {
            logger.error("Unexpected error applying settings", e)
            throw ConfigurationException("应用设置失败：${e.message}")
        }
    }

    override fun reset() {
        try {
            val currentState = settings.state

            customCommandField?.text = currentState.customCommand
            executablePathField?.text = currentState.executablePath

            // Clear any error messages
            commandErrorLabel?.isVisible = false

            logger.debug("Settings UI reset to current state")
        } catch (e: Exception) {
            logger.error("Failed to reset settings UI", e)
        }
    }

    override fun disposeUIResources() {
        try {
            mainPanel = null
            customCommandField = null
            executablePathField = null
            commandErrorLabel = null
            logger.debug("Settings UI resources disposed")
        } catch (e: Exception) {
            logger.error("Error disposing settings UI resources", e)
        }
    }
}
