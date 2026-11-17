# M6.2: Extended Response Protocol Research

**Status:** Investigation phase
**Date:** 2026-03-23
**Goal:** Determine what "extended response protocol support" means and scope implementation

## Current Understanding

### Known Response Types

1. **Single-frame responses** (current implementation)
   - Standard CI-V: `FE FE <to> <from> <cmd> <data> FD`
   - Parsed by dedicated functions in `commands.py`
   - Examples: frequency, mode, level, meter readings

2. **Multi-byte data responses**
   - Some commands return variable-length data (e.g., scope frames)
   - Currently handled by individual parsers
   - Example: Scope data (0x27) can return up to 675 bytes

3. **Extended Commands (0x1D 0x29)**
   - IC-7610 supports sub 0x29 for advanced features
   - IC-705, IC-7300 do NOT support this command
   - Already handled via profile `cmd29` capability flag

### Possible Meanings of "Extended Response Protocol"

#### Option A: Multi-Packet Responses
- Some commands return responses longer than single UDP packet
- May need reassembly logic
- Current: Scope streaming handles this via subscription model
- Status: ✅ Already implemented for scope

#### Option B: Progressive Responses
- Commands that stream data progressively (waterfall, RX audio)
- Current: Handled via `AudioStream` and scope subscription
- Status: ✅ Already implemented

#### Option C: Extended Command (0x1D 0x29) Protocol
- Commands for advanced IC-7610 features
- Current: All 134 IC-7610 commands implemented (M4 complete)
- Status: ✅ Already fully implemented
- Note: Profiles already gate this per-radio capability

#### Option D: Alternative Response Formats
- Some radios/commands return non-standard response formats
- Variable-length headers, different structure
- Current: Each command has dedicated parser
- Status: 🔍 Need to research if any unimplemented

#### Option E: NAK/Error Handling
- Extended error responses beyond simple NAK (0xFA)
- Current: Simple NAK detection exists
- Status: 🔍 Could be improved

## Investigation Checklist

- [ ] Review wfview source for "extended response" terminology
- [ ] Check Icom protocol documentation for response standards
- [ ] Analyze unimplemented IC-7610 commands for special response handling
- [ ] Test with real hardware if available
- [ ] Review error handling paths (NAK, timeouts, malformed frames)

## Current Implementation Status

### Confirmed Complete
- ✅ 134 IC-7610 commands with full response parsing
- ✅ Scope/waterfall streaming (multi-frame handling)
- ✅ Audio streaming (progressive data)
- ✅ Multi-radio support (profile-driven capability gating)
- ✅ Error/NAK handling via circuit breaker

### Potential Gaps
- ❓ Extended error response formats
- ❓ Alternative frame structures (non-standard)
- ❓ Radio-specific response variations
- ❓ Legacy/deprecated command formats

## Conclusion

Current codebase appears to already implement most response handling comprehensively:
- All 134 IC-7610 commands implemented with parsers
- Multi-frame responses handled (scope, audio)
- Progressive streaming working
- Extended commands gated by profile

**M6.2 Scope:**
1. Clarify what specific feature/gap exists
2. Research wfview for additional insights
3. Test with real hardware to identify issues
4. Implement if gap found

---

**Next Action:** Contact maintainer or review hardware testing results to identify specific extended response gaps.
