package co.edu.unicartagena.unixdriver

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.remember
import co.edu.unicartagena.unixdriver.state.AppStore
import co.edu.unicartagena.unixdriver.ui.AppRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val store = remember { AppStore() }
            AppRoot(store)
        }
    }
}
