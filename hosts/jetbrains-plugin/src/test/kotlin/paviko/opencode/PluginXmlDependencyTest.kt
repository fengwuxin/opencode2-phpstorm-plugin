package paviko.opencode

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import javax.xml.parsers.DocumentBuilderFactory

class PluginXmlDependencyTest {
    @Test
    fun `declares the JCEF platform dependency`() {
        val descriptor = requireNotNull(javaClass.classLoader.getResourceAsStream("META-INF/plugin.xml"))
        val dependencies = DocumentBuilderFactory.newInstance()
            .newDocumentBuilder()
            .parse(descriptor)
            .getElementsByTagName("depends")
            .let { nodes -> (0 until nodes.length).map { nodes.item(it).textContent.trim() } }

        assertTrue("com.intellij.modules.jcef" in dependencies)
    }
}
