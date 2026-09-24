pluginManagement {
    // Prefer local mirrors: the default plugin portal is very slow from some networks.
    repositories {
        maven("https://maven.aliyun.com/repository/gradle-plugin")
        maven("https://maven.aliyun.com/repository/public")
        gradlePluginPortal()
        mavenCentral()
    }
}

rootProject.name = "opencode-plugin"
