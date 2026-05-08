package com.example.chronos

import android.app.Application
import com.example.chronos.data.ChronosDatabase
import com.example.chronos.data.EntryDao

class ChronosApplication : Application() {
    val database: ChronosDatabase by lazy { ChronosDatabase.getInstance(this) }
    val entryDao: EntryDao by lazy { database.entryDao() }
}
