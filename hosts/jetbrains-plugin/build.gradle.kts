plugins {
    id("java")
    id("org.jetbrains.intellij.platform") version "2.2.1"
    // Must be able to read the Kotlin metadata of recent IDE platforms (2.3.x).
    kotlin("jvm") version "2.2.20"
}

group = "paviko.opencode"
version = "26.9.2403"

// opencode v2 only: the backend is never bundled, the CLI is resolved from the system.
val guiOnly = project.findProperty("guiOnly")?.toString()?.toBoolean() ?: true

// Bundle the UX+ web UI (requires packages/opencode/webgui-dist to be built first).
val withWebgui = project.findProperty("withWebgui")?.toString()?.toBoolean() ?: false
val webguiDist = project.findProperty("webguiDist")?.toString()

repositories {
    // Local mirrors first: the default repositories are very slow from some networks.
    maven("https://maven.aliyun.com/repository/public")
    maven("https://maven.aliyun.com/repository/gradle-plugin")
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

java {
    // Align with IntelliJ Platform 2024.3+ requirement
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

kotlin {
    jvmToolchain(21)
}

sourceSets {
    test {
        kotlin {
            srcDir("src/test/kotlin")
        }
    }
    
    // Create a separate source set for unit tests that don't need IntelliJ
    create("unitTest") {
        kotlin {
            srcDir("src/unitTest/kotlin")
        }
        resources {
            srcDir("src/unitTest/resources")
        }
        compileClasspath += sourceSets.main.get().output
        runtimeClasspath += output + compileClasspath
    }
}

dependencies {
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.1")

    // IntelliJ Platform dependencies.
    // Pass -PlocalIde=/Applications/PhpStorm.app to build against a locally installed IDE
    // instead of downloading a full IntelliJ IDEA distribution.
    intellijPlatform {
        val localIde = project.findProperty("localIde")?.toString()
        if (localIde != null) {
            local(localIde)
            bundledPlugin("org.jetbrains.plugins.terminal")
        } else {
            intellijIdeaCommunity("2024.3")
            bundledPlugin("com.intellij.java")
            bundledPlugin("org.jetbrains.plugins.terminal")
        }
    }

    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    testImplementation("org.mockito:mockito-core:5.5.0")
    testImplementation("org.mockito:mockito-inline:5.2.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.1.0")
    testImplementation(kotlin("test"))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
    
    // Unit test dependencies (no IntelliJ, no JUnit)
    "unitTestImplementation"("com.fasterxml.jackson.module:jackson-module-kotlin:2.17.1")
    "unitTestImplementation"(kotlin("stdlib"))
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild.set("243")
        }
        // Provide metadata without setting an upper build bound (no untilBuild)
        description = providers.provider {
            val f = file("description.html")
            if (!f.isFile) {
                return@provider "Runs local OpenCode backend and displays the chat UI."
            }

            val text = f.readText().trim()
            if (text.isEmpty()) {
                "Runs local OpenCode backend and displays the chat UI."
            } else {
                text
            }
        }
        changeNotes = providers.provider {
            val f = file("changelog.html")
            if (!f.isFile) {
                return@provider "See CHANGELOG.md for details."
            }

            val text = f.readText().trim()
            if (text.isEmpty()) {
                "See CHANGELOG.md for details."
            } else {
                text
            }
        }
    }
}

tasks {
    // IntelliJ code instrumentation needs an extra JetBrains artifact that is not always
    // reachable; this plugin does not rely on @NotNull instrumentation. The searchable
    // options index requires launching the IDE and is not needed either.
    matching {
        it.name == "instrumentCode" || it.name == "instrumentTestCode" || it.name == "buildSearchableOptions"
    }.configureEach { enabled = false }

    processResources {
        val minVersion = project.findProperty("opencode.min.version")?.toString() ?: "2.0.0"
        inputs.property("opencodeMinVersion", minVersion)
        filesMatching("opencode-build.properties") {
            expand("opencodeMinVersion" to minVersion)
        }

        if (guiOnly) {
            // Exclude bundled binaries for gui-only variant
            exclude("bin/**")
        }
    }

    // Bundle the webgui-dist output into the plugin resources and generate the
    // file-list.txt the runtime extractor uses to enumerate the bundled files.
    if (guiOnly && withWebgui) {
        val webguiSource = if (webguiDist != null) {
            file(webguiDist!!)
        } else {
            // hosts/jetbrains-plugin -> repository root -> packages/opencode/webgui-dist
            project.rootDir.parentFile.parentFile.resolve("packages/opencode/webgui-dist")
        }
        val fileListDir = layout.buildDirectory.dir("webgui-filelist")

        val generateFileList = register("generateWebguiFileList") {
            inputs.dir(webguiSource)
            outputs.dir(fileListDir)
            doLast {
                val outDir = fileListDir.get().asFile
                outDir.deleteRecursively()
                val target = outDir.resolve("webgui-app").apply { mkdirs() }
                val files = webguiSource.walkTopDown()
                    .filter { it.isFile && it.name != "file-list.txt" }
                    .map { it.relativeTo(webguiSource).invariantSeparatorsPath }
                    .sorted()
                    .toList()
                target.resolve("file-list.txt").writeText(files.joinToString("\n") + "\n")
                logger.lifecycle("Generated webgui-app/file-list.txt with ${files.size} entries")
            }
        }

        // Adding the files to processResources (instead of a separate copy task) keeps
        // them owned by one task so Gradle does not clean them up as stale outputs.
        named<org.gradle.language.jvm.tasks.ProcessResources>("processResources") {
            dependsOn(generateFileList)
            from(webguiSource) { into("webgui-app") }
            from(fileListDir)
        }
    }

    // Ensure no upper build bound is set in plugin.xml so the plugin stays compatible with newer IDEs
    patchPluginXml {
        // keep sinceBuild from pluginConfiguration, but expand upper bound to newer IDE builds
        untilBuild.set("261.*")

        if (guiOnly) {
            pluginId.set("fengwuxin.opencode-ux-plus-gui-only")
            pluginName.set("OpenCode UX+ GUI Only (fengwuxin)")
        }
    }

    prepareSandbox {
        from(rootProject.rootDir.resolve("LICENSE")) {
            into("${intellijPlatform.projectName.get()}")
        }
    }

    // Rename output archive for gui-only variant
    if (guiOnly) {
        named<Zip>("buildPlugin") {
            archiveBaseName.set("opencode-plugin-gui-only")
        }
    }

    
    // Configure test task for IntelliJ integration tests
    test {
        useJUnitPlatform()
        
        systemProperty("java.awt.headless", "true")
        systemProperty("idea.test.cyclic.buffer.size", "1048576")
        systemProperty("idea.home.path", "")
        
        jvmArgs(
            "-Djava.awt.headless=true",
            "--add-opens=java.base/java.lang=ALL-UNNAMED",
            "--add-opens=java.base/java.util=ALL-UNNAMED"
        )
    }
    
    // Create unit test task that runs without IntelliJ dependencies
    register<JavaExec>("unitTest") {
        dependsOn("compileUnitTestKotlin")
        
        mainClass.set("paviko.opencode.ui.StandaloneMessageTestKt")
        classpath = sourceSets["unitTest"].runtimeClasspath
        
        systemProperty("java.awt.headless", "true")
        
        jvmArgs(
            "-Djava.awt.headless=true",
            "--add-opens=java.base/java.lang=ALL-UNNAMED",
            "--add-opens=java.base/java.util=ALL-UNNAMED"
        )
    }
    
    // Make build depend on unit tests
    build {
        dependsOn("unitTest")
    }
}
