package paviko.opencode.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.diagnostic.Logger

/**
 * Persistent settings component for OpenCode plugin configuration.
 * Manages user preference for custom command only.
 */
@State(
    name = "OpenCodeSettings",
    storages = [Storage("opencode.xml")]
)
@Service
class OpenCodeSettings : PersistentStateComponent<OpenCodeSettings.State> {

    /**
     * Data class representing the persistent state of OpenCode settings.
     */
    data class State(
        /**
         * Custom command to override the default "opencode serve".
         * Empty string means use the default command.
         */
        var customCommand: String = "",

        /**
         * Absolute path to the opencode executable. Empty string means auto discovery
         * (well known install locations, then the IDE process PATH, then the shell PATH).
         */
        var executablePath: String = ""
    )

    private var state = State()
    private val logger = Logger.getInstance(OpenCodeSettings::class.java)

    override fun getState(): State {
        try {
            return state
        } catch (e: Exception) {
            logger.error("Failed to get settings state, returning default", e)
            return State() // Return default state on error
        }
    }

    override fun loadState(state: State) {
        try {
            val validatedState = State(
                customCommand = state.customCommand,
                executablePath = state.executablePath
            )

            this.state = validatedState
            logger.info("Settings loaded successfully: customCommand='${validatedState.customCommand}', executablePath='${validatedState.executablePath}'")
        } catch (e: Exception) {
            logger.error("Failed to load settings state, using defaults", e)
            this.state = State() // Use default state on error
        }
    }

    companion object {
        /**
         * Gets the application-level instance of OpenCodeSettings.
         */
        fun getInstance(): OpenCodeSettings {
            return try {
                ApplicationManager.getApplication().getService(OpenCodeSettings::class.java)
            } catch (e: Exception) {
                Logger.getInstance(OpenCodeSettings::class.java).error("Failed to get settings service instance", e)
                throw e
            }
        }
    }
}
