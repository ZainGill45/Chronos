package com.example.chronos.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.chronos.ChronosApplication
import com.example.chronos.data.Entry
import com.example.chronos.data.EntryDao
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class EntriesViewModel(private val dao: EntryDao) : ViewModel() {

    val entries: StateFlow<List<Entry>> = dao.observeAll()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList()
        )

    fun addEntry(hourStartEpochMillis: Long, description: String) {
        viewModelScope.launch {
            dao.insert(
                Entry(
                    hourStartEpochMillis = hourStartEpochMillis,
                    description = description
                )
            )
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as ChronosApplication
                EntriesViewModel(app.entryDao)
            }
        }
    }
}
